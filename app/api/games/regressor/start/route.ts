// POST /api/games/regressor/start
// Charges 75 tokens (covers all runs). Generates the disaster scenario.
// Also handles starting a new run within an existing session (no extra charge).

import { NextResponse } from 'next/server'
import { cookies }      from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import OpenAI           from 'openai'
import { parseJsonBody, sanitizeText } from '@/lib/sanitize'

const GAME_COST  = 75
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
  const systemPrompt = `You are a xianxia cultivation story generator.
Create a Great Disaster scenario for a regression game. The player is a cultivator who died in the disaster and has regressed back in time with 30 days to prevent it.

The disaster should be:
- Dramatic and specific (not vague)
- Stoppable if the player figures out the root cause
- Rooted in xianxia lore (sect politics, demonic cultivation, ancient sealed evils, heavenly tribulations, betrayals, etc.)
- Different every time — vary the type, scale, and players involved

Return ONLY valid JSON:
{
  "disaster": {
    "name": "Short dramatic name (e.g. 'The Crimson Moon Massacre')",
    "description": "2-3 sentences. What happens, who dies, the scale of destruction.",
    "hint": "One vague clue about the root cause — something the player died knowing but not understanding."
  },
  "worldContext": "2-3 sentences setting the scene: where we are, what sect, what era, the political landscape.",
  "openingNarration": "3-4 sentences. The player wakes up in their past body. Vivid sensory detail. The dread of knowing what's coming."
}`

  let disaster: RegressorState['disaster'] | null = null
  let worldContext = ''
  let openingNarration = ''

  try {
    const completion = await openai.chat.completions.create({
      model:           'gpt-4o-mini',
      messages:        [{ role: 'system', content: systemPrompt }],
      response_format: { type: 'json_object' },
      temperature:     0.95,
      max_tokens:      600,
    })
    const d = JSON.parse(completion.choices[0].message.content ?? '{}')
    if (d.disaster?.name && d.worldContext) {
      disaster        = d.disaster
      worldContext    = d.worldContext
      openingNarration = d.openingNarration ?? ''
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
    openingNarration,
    currentTurn:     1,
    maxTurns:        MAX_TURNS,
    currentRun:      1,
    pastRuns:        [],
    phase:           'active',
  })
}
