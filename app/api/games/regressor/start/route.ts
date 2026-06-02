// POST /api/games/regressor/start
// Charges 50 tokens (covers all runs). Generates the disaster scenario.
// Also handles starting a new run within an existing session (no extra charge).

import { NextResponse } from 'next/server'
import { cookies }      from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import OpenAI           from 'openai'
import { parseJsonBody, sanitizeText } from '@/lib/sanitize'

const GAME_COST  = 50
const MAX_TURNS  = 30

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface RegressorState {
  phase:        'active' | 'run_end' | 'victory'
  disaster:     { name: string; description: string; hint: string }
  worldContext: string
  // A power carried back from the past life — the regression "cheat" that fuels
  // the power fantasy, balanced by a real drawback.
  regressorPower?: { name: string; description: string; drawback: string }
  archetype?:    string
  abilityHint?:  string   // subtle, player-facing teaser (the power is never explained outright)
  currentTurn:  number
  currentRun:   number
  turns: Array<{ turn: number; action: string; narration: string }>
  pastRuns: Array<{
    runNumber:      number
    turnsReached:   number
    endReason:      string
    lessonsLearned: string
  }>
  runEndReason:  string | null
}

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Sign in to play' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  const parsed = await parseJsonBody(req, 256)
  const body   = parsed.ok ? (parsed.data as Record<string, unknown>) : {}
  const resumeId = sanitizeText(body.resumeSessionId, 64) || null

  // ── Resume existing session ────────────────────────────────────────────────
  if (resumeId) {
    const { data: existing } = await sb
      .from('game_sessions')
      .select('id, state')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .eq('game_type', 'regressor')
      .single()

    if (existing) {
      return NextResponse.json({ sessionId: existing.id, ...existing.state })
    }
  }

  // ── New session — charge tokens ────────────────────────────────────────────
  const { data: profile } = await sb.from('profiles').select('tokens').eq('id', user.id).single()
  if (!profile || profile.tokens < GAME_COST) {
    return NextResponse.json(
      { error: `Not enough tokens. Regressor Challenge costs ${GAME_COST} tokens (covers all runs).`, code: 'INSUFFICIENT_TOKENS' },
      { status: 402 },
    )
  }
  await sb.from('profiles').update({ tokens: profile.tokens - GAME_COST }).eq('id', user.id)

  // ── Generate disaster scenario ────────────────────────────────────────────
  const systemPrompt = `You are a xianxia cultivation story generator for a HARD regression roguelike. The player died in a great disaster and regressed 30 days into the past to prevent it. The loop is the fun: die, learn the hidden rules, return stronger.

Generate a scenario that is GENUINELY DIFFICULT and high-stakes — a world that punishes carelessness with sudden death but rewards clever, observant, information-driven play. There should be hidden lethal dangers (traps, traitors, forbidden ground, poison, ambushes) that a first-life player cannot know about — only by dying and regressing do they learn.

ALSO give the player a power-fantasy edge: a "Regressor's Power" carried back from their past life — a cultivation technique, a System, a bloodline, or forbidden knowledge — that makes them feel strong, BUT with a real drawback that stops it from trivially winning. And assign a fun cultivation-novel ARCHETYPE for the player's role.

The disaster must be:
- Dramatic, specific, and HARD to stop (a wrong move is fatal; the correct path is non-obvious)
- Solvable only by piecing together hidden information across lives
- Rooted in xianxia lore (sect politics, demonic cultivation, sealed evils, heavenly tribulation, betrayal)
- Different every time

Return ONLY valid JSON:
{
  "archetype": "A cultivation-novel role for the player (e.g. 'Disgraced Outer Disciple with a Hidden Heritage', 'The Sect's Overlooked Alchemist', 'Sword Prodigy Crippled by a Rival').",
  "regressorPower": {
    "name": "Evocative name (e.g. 'Eye of the Returned', 'Heaven-Defying Reincarnation Art').",
    "description": "1-2 sentences. A power that makes the player feel strong — e.g. read a person's killing intent, rewind a few seconds of combat, sense lies, a devastating technique. Make it cool.",
    "drawback": "1 sentence. A real cost/limit — backlash, cooldown, qi drain, it reveals the player as a regressor if overused, etc."
  },
  "disaster": {
    "name": "Short dramatic name (e.g. 'The Crimson Moon Massacre').",
    "description": "2-3 sentences. What happens, who dies, the scale of destruction. Make the stakes feel lethal.",
    "hint": "One cryptic clue the player died knowing but not understanding."
  },
  "worldContext": "2-3 sentences: where we are, what sect, what era, the political landscape, who holds power.",
  "openingNarration": "4-5 sentences. The player wakes in their past body. SUBTLY weave in ONE unexplained flicker of the Regressor's Power — an instinct, a sensation, a strange certainty — barely perceptible and NEVER named or explained; the player must uncover what it is over many lives. Vivid sensory detail and the dread of what is coming.",
  "abilityHint": "ONE cryptic sentence (max 14 words) that passively hints at the power or an affinity WITHOUT naming it — a fragment of intuition for the player to puzzle over (e.g. 'Cold dread crawls up your spine an instant before someone means you harm.')."
}

IMPORTANT: The Regressor's Power is a MYSTERY the player discovers through play. NEVER state it plainly — only hint it subtly in openingNarration and abilityHint.`

  let disaster: RegressorState['disaster'] | null = null
  let worldContext = ''
  let openingNarration = ''
  let regressorPower: RegressorState['regressorPower'] = undefined
  let archetype = ''
  let abilityHint = ''

  try {
    const completion = await openai.chat.completions.create({
      model:           'gpt-4o-mini',
      messages:        [{ role: 'system', content: systemPrompt }],
      response_format: { type: 'json_object' },
      temperature:     0.95,
      max_tokens:      900,
    })
    const d = JSON.parse(completion.choices[0].message.content ?? '{}')
    if (d.disaster?.name && d.worldContext) {
      disaster        = d.disaster
      worldContext    = d.worldContext
      openingNarration = d.openingNarration ?? ''
      if (d.regressorPower?.name) regressorPower = d.regressorPower
      if (typeof d.archetype === 'string') archetype = d.archetype
      if (typeof d.abilityHint === 'string') abilityHint = d.abilityHint
    }
  } catch (e) {
    console.error('[regressor/start] AI error:', e)
    await sb.from('profiles').update({ tokens: profile.tokens }).eq('id', user.id)
    return NextResponse.json({ error: 'Failed to generate scenario. Tokens refunded.' }, { status: 502 })
  }

  if (!disaster) {
    await sb.from('profiles').update({ tokens: profile.tokens }).eq('id', user.id)
    return NextResponse.json({ error: 'Scenario generation failed. Tokens refunded.' }, { status: 502 })
  }

  // ── Create session ─────────────────────────────────────────────────────────
  const state: RegressorState = {
    phase:        'active',
    disaster,
    worldContext,
    regressorPower,
    archetype,
    abilityHint,
    currentTurn:  1,
    currentRun:   1,
    turns:        [],
    pastRuns:     [],
    runEndReason: null,
  }

  const { data: session, error: sessionErr } = await sb
    .from('game_sessions')
    .insert({
      user_id:    user.id,
      game_type:  'regressor',
      state,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    })
    .select('id')
    .single()

  if (sessionErr || !session) {
    await sb.from('profiles').update({ tokens: profile.tokens }).eq('id', user.id)
    return NextResponse.json({ error: 'Failed to start session' }, { status: 500 })
  }

  return NextResponse.json({
    sessionId:       session.id,
    disaster,
    worldContext,
    // The power itself is intentionally NOT sent to the client — only a subtle
    // hint. The player discovers what it actually does over multiple lives.
    abilityHint,
    openingNarration,
    currentTurn:     1,
    maxTurns:        MAX_TURNS,
    currentRun:      1,
    pastRuns:        [],
    phase:           'active',
  })
}
