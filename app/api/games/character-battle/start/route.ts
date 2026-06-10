// POST /api/games/character-battle/start
// Charges 25 tokens. Fetches character profiles + relevant chapter context for both
// fighters, generates a lore-accurate battle simulation, and returns the result.

import { NextResponse } from 'next/server'
import { cookies }      from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import OpenAI           from 'openai'
import { parseJsonBody, sanitizeText } from '@/lib/sanitize'
import { triggerEmbed } from '@/lib/vps'
import { keywordSearch } from '@/lib/qdrant'

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
      // Chunks mentioning this character, from Qdrant (legacy Supabase `chunks`
      // table was removed in the Qdrant migration — games must read Qdrant).
      const chunks = await keywordSearch(novelSlug, name, MAX_CHAPTER_CHUNKS, maxChapter || undefined)

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

  const systemPrompt = `You are an elite web-novel power-scaling analyst running an in-depth Character Battle. Two characters face off. Produce a RIGOROUS, deeply detailed, completely OBJECTIVE breakdown — far deeper than a casual chat answer — and a brutally HONEST verdict.

ABSOLUTE OBJECTIVITY — non-negotiable, applies to every part of this:
- Judge ONLY by actual feats, abilities, and power scaling from the novels' established lore (use the excerpts AND your knowledge of these specific stories). Never invent feats that don't exist.
- NEVER inflate the weaker fighter or downplay the stronger one for drama, suspense, or "fairness." Most cross-novel matchups are LOPSIDED — if one massively out-scales the other, say so plainly. A curbstomp must read as a curbstomp. Do NOT manufacture a close fight that isn't there.
- Every claim must tie to a specific feat, technique, realm/tier, or counter. No vague hand-waving, no false balance.

Write a DEEP analysis in the "narrative" field with these sections IN THIS ORDER. Put each section header and each bullet point on ITS OWN LINE (single line breaks):

POWER SCALING — for EACH fighter: the highest realm/tier/level they reached and what that actually means cosmologically (planetary, star, universal, etc. where the lore supports it).
FEATS — for EACH fighter, bullet the key feats by category: Strength, Durability, Speed/Reactions, Abilities/Techniques, Combat Skill, Intelligence/Strategy. Cite specifics.
SYSTEMS — compare their power systems (cultivation / Gu / etc.): what each can and cannot do, and their hard limits.
DECISIVE FACTORS — the EXACT techniques, counters, and scaling that decide it: who hard-counters whom, and precisely what the loser has NO answer to. If it is a genuine STALEMATE (e.g. one is functionally immortal and the other has no means to kill an immortal), say so and explain why NEITHER can win.
THE CLASH — a short, vivid battle consistent with everything above. If the analysis is one-sided, the clash must be one-sided too.

Then fill the remaining fields HONESTLY (do not soften them):

Return ONLY valid JSON:
{
  "narrative": "the full sectioned analysis (headers + bullets, each on its own line)",
  "winner": "A" | "B" | "draw",
  "winnerName": "Character name (or 'Stalemate')",
  "reasoning": "1-2 sentences naming the gap honestly — e.g. 'A stomps; B is out-scaled by tiers and has no counter to X' or 'true stalemate: neither can kill the other because…'",
  "closeness": "curbstomp" | "dominant" | "competitive" | "close" | "stalemate"
}
Use "curbstomp" when one obliterates the other (not close at all). Use "stalemate" (with winner "draw") ONLY when neither can actually defeat the other. Never default to "close" to seem balanced.`

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
      temperature:     0.6,
      max_tokens:      2600,
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
