// POST /api/games/character-battle/start
// Charges 25 tokens. Fetches character profiles + relevant chapter context for both
// fighters, generates a lore-accurate battle simulation, and returns the result.

import { NextResponse } from 'next/server'
import { cookies }      from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import OpenAI           from 'openai'
import { parseJsonBody, sanitizeText } from '@/lib/sanitize'
import { triggerEmbed } from '@/lib/vps'

const GAME_COST = 20
const MAX_CHAPTER_CHUNKS = 8   // chunks per fighter for battle context

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface Fighter {
  name:       string
  novelSlug:  string
  novelTitle: string
  maxChapter: number | null   // null = all chapters
}

interface FighterContext {
  name:       string
  novelTitle: string
  maxChapter: number | null
  profile:    string   // synthesised character profile text
  chapterContext: string  // relevant chapter excerpts
}

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const token = cookieStore.get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Sign in to play' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  // ── Token check ───────────────────────────────────────────────────────────────
  const { data: profile } = await sb
    .from('profiles')
    .select('tokens')
    .eq('id', user.id)
    .single()

  if (!profile || profile.tokens < GAME_COST) {
    return NextResponse.json(
      { error: `Not enough tokens. This match costs ${GAME_COST} tokens.`, code: 'INSUFFICIENT_TOKENS' },
      { status: 402 },
    )
  }

  // ── Parse fighters ────────────────────────────────────────────────────────────
  const parsed = await parseJsonBody(req, 1024)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const body = parsed.data as Record<string, unknown>

  const fighterA = body.fighterA as Partial<Fighter> | undefined
  const fighterB = body.fighterB as Partial<Fighter> | undefined

  const nameA       = sanitizeText(fighterA?.name, 80)
  const novelSlugA  = sanitizeText(fighterA?.novelSlug, 100)
  const novelTitleA = sanitizeText(fighterA?.novelTitle, 200)
  const maxChapterA = typeof fighterA?.maxChapter === 'number' && fighterA.maxChapter > 0
    ? Math.floor(fighterA.maxChapter) : null

  const nameB       = sanitizeText(fighterB?.name, 80)
  const novelSlugB  = sanitizeText(fighterB?.novelSlug, 100)
  const novelTitleB = sanitizeText(fighterB?.novelTitle, 200)
  const maxChapterB = typeof fighterB?.maxChapter === 'number' && fighterB.maxChapter > 0
    ? Math.floor(fighterB.maxChapter) : null

  if (!nameA || !novelSlugA || !nameB || !novelSlugB) {
    return NextResponse.json({ error: 'Both fighters must have a name and novel' }, { status: 400 })
  }
  if (nameA.toLowerCase() === nameB.toLowerCase() && novelSlugA === novelSlugB) {
    return NextResponse.json({ error: 'Fighters must be different characters' }, { status: 400 })
  }

  // ── Deduct tokens ─────────────────────────────────────────────────────────────
  await sb.from('profiles')
    .update({ tokens: profile.tokens - GAME_COST })
    .eq('id', user.id)

  // ── Fetch character context for both fighters in parallel ─────────────────────
  async function getCharacterContext(
    name: string,
    novelSlug: string,
    novelTitle: string,
    maxChapter: number | null,
  ): Promise<FighterContext> {
    // 1. Get cached character profiles from novel_characters table
    let profileText = ''
    try {
      const { data: nc } = await sb
        .from('novel_characters')
        .select('profiles')
        .eq('slug', novelSlug)
        .maybeSingle()

      if (nc?.profiles && Array.isArray(nc.profiles)) {
        const charProfile = (nc.profiles as Array<{ name: string; speech_style?: string; core_traits?: string[]; motivation?: string }>)
          .find(p => p.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(p.name.toLowerCase()))

        if (charProfile) {
          profileText = [
            `Name: ${charProfile.name}`,
            charProfile.motivation  ? `Motivation: ${charProfile.motivation}` : '',
            charProfile.core_traits?.length ? `Traits: ${charProfile.core_traits.join(', ')}` : '',
            charProfile.speech_style ? `Voice: ${charProfile.speech_style}` : '',
          ].filter(Boolean).join('\n')
        }
      }
    } catch { /* non-fatal */ }

    // 2. Get relevant chapter excerpts (text mentioning this character's name)
    let chapterContext = ''
    try {
      let query = sb
        .from('chunks')
        .select('text, chapter_number, chapter_title')
        .eq('slug', novelSlug)
        .ilike('text', `%${name.split(' ')[0]}%`)   // search by first name token
        .order('chapter_number', { ascending: true })
        .limit(MAX_CHAPTER_CHUNKS)

      if (maxChapter) {
        query = query.lte('chapter_number', maxChapter)
      }

      const { data: chunks } = await query

      if (chunks && chunks.length > 0) {
        chapterContext = chunks
          .map(c => `[Ch. ${c.chapter_number}${c.chapter_title ? ` — ${c.chapter_title}` : ''}]\n${c.text.slice(0, 400)}`)
          .join('\n\n')
      } else {
        // Not indexed yet — kick off silent indexing so the next battle is grounded.
        triggerEmbed(novelSlug).catch(() => {})
      }
    } catch {
      triggerEmbed(novelSlug).catch(() => {})
    }

    return {
      name,
      novelTitle: novelTitle || novelSlug.replace(/-/g, ' '),
      maxChapter,
      profile:    profileText,
      chapterContext,
    }
  }

  const [ctxA, ctxB] = await Promise.all([
    getCharacterContext(nameA, novelSlugA, novelTitleA, maxChapterA),
    getCharacterContext(nameB, novelSlugB, novelTitleB, maxChapterB),
  ])

  // ── Generate battle simulation ────────────────────────────────────────────────
  function formatFighter(label: string, ctx: FighterContext): string {
    const chapNote = ctx.maxChapter ? ` (as of chapter ${ctx.maxChapter})` : ' (full novel)'
    return [
      `## Fighter ${label}: ${ctx.name}`,
      `Novel: "${ctx.novelTitle}"${chapNote}`,
      ctx.profile     ? `\nCharacter Profile:\n${ctx.profile}` : '',
      ctx.chapterContext ? `\nRelevant Chapter Excerpts:\n${ctx.chapterContext}` : '',
    ].filter(Boolean).join('\n')
  }

  const userPrompt = [formatFighter('A', ctxA), '', formatFighter('B', ctxB)].join('\n')

  const systemPrompt = `You are the narrator of a xianxia cultivation battle.
Two fighters are about to clash. Use the character information and chapter excerpts provided to write a lore-accurate battle simulation.

Rules:
1. Base power levels and abilities STRICTLY on what the provided text shows — no assumptions beyond the given chapter range.
2. If the fighters are from different novels, acknowledge the cross-world nature briefly.
3. Narrative style: dramatic, fast-paced, xianxia cinematic. Use cultivation terms naturally.
4. Write a 4-6 paragraph battle narrative, then declare a winner based on the lore evidence.
5. If the evidence is genuinely balanced, call it a draw with explanation.
6. Be willing to make a decisive call — readers want a winner.

Return ONLY valid JSON:
{
  "narrative": "4-6 paragraph battle narration",
  "winner": "A" | "B" | "draw",
  "winnerName": "Character name",
  "reasoning": "2-3 sentences: why this fighter wins based on the lore evidence",
  "closeness": "dominant" | "moderate" | "close" | "extremely_close"
}`

  let battleResult: {
    narrative:  string
    winner:     'A' | 'B' | 'draw'
    winnerName: string
    reasoning:  string
    closeness:  string
  } | null = null

  try {
    const completion = await openai.chat.completions.create({
      model:           'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature:     0.8,
      max_tokens:      1200,
    })

    const aiParsed = JSON.parse(completion.choices[0].message.content ?? '{}')
    if (aiParsed.narrative && aiParsed.winner) {
      battleResult = {
        narrative:  aiParsed.narrative,
        winner:     aiParsed.winner === 'draw' ? 'draw' : (aiParsed.winner === 'A' ? 'A' : 'B'),
        winnerName: aiParsed.winnerName ?? (aiParsed.winner === 'A' ? nameA : aiParsed.winner === 'B' ? nameB : 'Draw'),
        reasoning:  aiParsed.reasoning ?? '',
        closeness:  aiParsed.closeness ?? 'moderate',
      }
    }
  } catch (e) {
    console.error('[character-battle/start] AI error:', e)
    // Refund on AI failure
    await sb.from('profiles').update({ tokens: profile.tokens }).eq('id', user.id)
    return NextResponse.json({ error: 'Battle simulation failed. Tokens refunded.' }, { status: 502 })
  }

  if (!battleResult) {
    await sb.from('profiles').update({ tokens: profile.tokens }).eq('id', user.id)
    return NextResponse.json({ error: 'Battle simulation failed. Tokens refunded.' }, { status: 502 })
  }

  // ── Store session ─────────────────────────────────────────────────────────────
  await sb.from('game_sessions').insert({
    user_id:   user.id,
    game_type: 'character-battle',
    state: {
      fighterA:    { name: nameA, novelTitle: ctxA.novelTitle, maxChapter: maxChapterA },
      fighterB:    { name: nameB, novelTitle: ctxB.novelTitle, maxChapter: maxChapterB },
      battleResult,
    },
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  }).select('id').single()

  return NextResponse.json({
    fighterA:  { name: nameA, novelTitle: ctxA.novelTitle, maxChapter: maxChapterA },
    fighterB:  { name: nameB, novelTitle: ctxB.novelTitle, maxChapter: maxChapterB },
    ...battleResult,
  })
}
