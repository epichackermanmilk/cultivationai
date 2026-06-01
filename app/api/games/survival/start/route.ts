// POST /api/games/survival/start
// 50 tokens flat — covers up to MAX_ATTEMPTS tries at the chosen arc.
// Picks a novel + arc range, generates the player's identity + opening scene.

import { NextResponse } from 'next/server'
import { cookies }      from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import OpenAI           from 'openai'
import { parseJsonBody, sanitizeText } from '@/lib/sanitize'
import { triggerEmbed } from '@/lib/vps'

const GAME_COST = 50
const MAX_TURNS = 50

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface SurvivalState {
  phase:        'active' | 'dead' | 'survived'
  novelSlug:    string
  novelTitle:   string
  novelAuthor:  string
  arcLabel:     string
  chapterFrom:  number
  chapterTo:    number
  player: {
    name:             string
    background:       string
    cultivationLevel: string
    startingPosition: string
  }
  currentTurn:  number
  maxTurns:     number
  turns: Array<{ turn: number; action: string; narration: string }>
  runNumber:    number
  deathReason:  string | null
  pastRuns: Array<{ runNumber: number; turnsReached: number; deathReason: string }>
}

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Sign in to play' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  const parsed = await parseJsonBody(req, 512)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const body = parsed.data as Record<string, unknown>

  const resumeId  = sanitizeText(body.resumeSessionId, 64) || null
  const novelSlug = sanitizeText(body.novelSlug,  120)
  const novelTitle = sanitizeText(body.novelTitle, 200) || novelSlug?.replace(/-/g, ' ') || ''
  const novelAuthor = sanitizeText(body.novelAuthor, 120) || ''
  const arcLabel  = sanitizeText(body.arcLabel,   100) || 'Beginning'
  const chapterFrom = typeof body.chapterFrom === 'number' ? Math.max(1, body.chapterFrom) : 1
  const chapterTo   = typeof body.chapterTo   === 'number' ? Math.max(chapterFrom + 10, body.chapterTo) : chapterFrom + 50

  // Resume existing session
  if (resumeId) {
    const { data: existing } = await sb
      .from('game_sessions')
      .select('id, state')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .eq('game_type', 'survival')
      .single()
    if (existing) {
      const state = existing.state as SurvivalState
      return NextResponse.json({ sessionId: existing.id, ...state })
    }
  }

  if (!novelSlug) return NextResponse.json({ error: 'novelSlug required' }, { status: 400 })

  // Token check
  const { data: profile } = await sb.from('profiles').select('tokens').eq('id', user.id).single()
  if (!profile || profile.tokens < GAME_COST) {
    return NextResponse.json(
      { error: `Not enough tokens. Survival in the Novel costs ${GAME_COST} tokens (covers all attempts).`, code: 'INSUFFICIENT_TOKENS' },
      { status: 402 },
    )
  }
  await sb.from('profiles').update({ tokens: profile.tokens - GAME_COST }).eq('id', user.id)

  // Pull opening chapter context via RAG (text search, no embedding needed).
  // If the novel isn't indexed yet, silently kick off indexing for next time —
  // the scenario still generates now via faithful improvisation, no blocking.
  let chapterContext = ''
  try {
    const { data: chunks } = await sb
      .from('chunks')
      .select('text, chapter_number')
      .eq('slug', novelSlug)
      .gte('chapter_number', chapterFrom)
      .lte('chapter_number', Math.min(chapterFrom + 10, chapterTo))
      .order('chapter_number', { ascending: true })
      .limit(6)
    if (chunks && chunks.length > 0) {
      chapterContext = chunks.map(c => `[Ch. ${c.chapter_number}]\n${c.text.slice(0, 500)}`).join('\n\n')
    } else {
      triggerEmbed(novelSlug).catch(() => {})
    }
  } catch {
    triggerEmbed(novelSlug).catch(() => {})
  }

  // Generate player identity + opening scene
  const systemPrompt = `You are setting up a xianxia immersive fiction experience.
The player has "transmigrated" into the novel "${novelTitle}"${novelAuthor ? ` by ${novelAuthor}` : ''} and must survive.

Context from the novel (chapters ${chapterFrom}-${Math.min(chapterFrom+10, chapterTo)}):
${chapterContext || 'No chapter data available — improvise a setting faithful to the novel\'s genre.'}

Generate:
1. A SIDE CHARACTER identity for the player (NOT the main character — someone adjacent to the story who would naturally be present)
2. A vivid opening scene that places them in the novel world at this arc's start
3. An immediate problem or tension they need to navigate

Return ONLY valid JSON:
{
  "player": {
    "name": "Character name appropriate to the setting",
    "background": "2-3 sentences: who they are, their cultivation level, their relation to the main storyline",
    "cultivationLevel": "Cultivation stage name appropriate to the novel",
    "startingPosition": "Where they start and what role they play"
  },
  "openingNarration": "4-6 sentences. Vivid scene-setting. Second person. Drop the player into the moment with sensory detail and immediate tension.",
  "immediateChallenge": "1 sentence describing the first decision they face"
}`

  let playerData: SurvivalState['player'] | null = null
  let openingNarration = ''
  let immediateChallenge = ''

  try {
    const completion = await openai.chat.completions.create({
      model:           'gpt-4o-mini',
      messages:        [{ role: 'system', content: systemPrompt }],
      response_format: { type: 'json_object' },
      temperature:     0.9,
      max_tokens:      600,
    })
    const d = JSON.parse(completion.choices[0].message.content ?? '{}')
    if (d.player?.name) {
      playerData          = d.player
      openingNarration    = d.openingNarration ?? ''
      immediateChallenge  = d.immediateChallenge ?? ''
    }
  } catch (e) {
    console.error('[survival/start] AI error:', e)
    await sb.from('profiles').update({ tokens: profile.tokens }).eq('id', user.id)
    return NextResponse.json({ error: 'Failed to generate scenario. Tokens refunded.' }, { status: 502 })
  }

  if (!playerData) {
    await sb.from('profiles').update({ tokens: profile.tokens }).eq('id', user.id)
    return NextResponse.json({ error: 'Scenario generation failed. Tokens refunded.' }, { status: 502 })
  }

  const state: SurvivalState = {
    phase:        'active',
    novelSlug,
    novelTitle,
    novelAuthor,
    arcLabel,
    chapterFrom,
    chapterTo,
    player:       playerData,
    currentTurn:  1,
    maxTurns:     MAX_TURNS,
    turns:        [],
    runNumber:    1,
    deathReason:  null,
    pastRuns:     [],
  }

  const { data: session, error: sessionErr } = await sb
    .from('game_sessions')
    .insert({
      user_id:   user.id,
      game_type: 'survival',
      state,
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('id')
    .single()

  if (sessionErr || !session) {
    await sb.from('profiles').update({ tokens: profile.tokens }).eq('id', user.id)
    return NextResponse.json({ error: 'Failed to start session' }, { status: 500 })
  }

  return NextResponse.json({
    sessionId: session.id,
    ...state,
    openingNarration,
    immediateChallenge,
  })
}
