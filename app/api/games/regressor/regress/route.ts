// POST /api/games/regressor/regress
// Ends the current run, generates lessons learned, prepares the next run.
// No token charge — all runs are covered by the initial 75-token fee.
// Capped at MAX_RUNS lives (the regression fantasy, bounded).

import { NextResponse } from 'next/server'
import { cookies }      from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import OpenAI           from 'openai'
import { parseJsonBody, sanitizeText } from '@/lib/sanitize'
import type { RegressorState }         from '../start/route'

export const MAX_RUNS = 6   // total lives per session (run 1 + up to 5 regressions)

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Sign in to play' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  const parsed = await parseJsonBody(req, 256)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const body      = parsed.data as Record<string, unknown>
  const sessionId = sanitizeText(body.sessionId, 64)
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const { data: row } = await sb
    .from('game_sessions')
    .select('id, user_id, state')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!row) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const state = row.state as RegressorState
  if (state.phase !== 'run_end') return NextResponse.json({ error: 'Run is still active' }, { status: 400 })

  // ── Enforce the run cap ────────────────────────────────────────────────────
  if (state.currentRun >= MAX_RUNS) {
    return NextResponse.json(
      { error: 'No regressions left — your cycle of lives has ended.', code: 'RUNS_EXHAUSTED', maxRuns: MAX_RUNS },
      { status: 403 },
    )
  }

  const runSummary = state.turns
    .map(t => `Day ${t.turn}: ${t.action} → ${t.narration.slice(0, 150)}`)
    .join('\n')

  // ── Generate lessons learned ───────────────────────────────────────────────
  let lessonsLearned = `You reached Day ${state.currentTurn} before ${state.runEndReason === 'death' ? 'dying' : 'the disaster struck'}.`

  try {
    const completion = await openai.chat.completions.create({
      model:       'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: `You are summarizing what a regressor learned in one of their past lives.

The Great Disaster: ${state.disaster.name} — ${state.disaster.description}
The player reached Day ${state.currentTurn} of 30 before ${state.runEndReason === 'death' ? 'dying' : 'the disaster struck'}.

Their actions this life:
${runSummary}

Write 2-3 sentences in second person, past tense, as memories carried into the next life.
Focus on: what they discovered, what went wrong, what they'd do differently.
Start with "In your ${ordinal(state.currentRun)} life, you..."
Be specific to what actually happened. These memories will guide them next time.`,
      }],
      temperature: 0.8,
      max_tokens:  150,
    })
    lessonsLearned = completion.choices[0].message.content?.trim() ?? lessonsLearned
  } catch { /* use fallback */ }

  // ── Archive run + start new run ────────────────────────────────────────────
  const completedRun = {
    runNumber:      state.currentRun,
    turnsReached:   state.currentTurn,
    endReason:      state.runEndReason ?? 'unknown',
    lessonsLearned,
  }

  const newState: RegressorState = {
    ...state,
    phase:        'active',
    currentTurn:  1,
    currentRun:   state.currentRun + 1,
    turns:        [],
    pastRuns:     [...state.pastRuns, completedRun],
    runEndReason: null,
  }

  await sb.from('game_sessions').update({ state: newState }).eq('id', sessionId)

  return NextResponse.json({
    lessonsLearned,
    runNumber:    state.currentRun,
    newRunNumber: state.currentRun + 1,
    disaster:     state.disaster,
    worldContext: state.worldContext,
    pastRuns:     newState.pastRuns,
    maxRuns:      MAX_RUNS,
    runsLeft:     MAX_RUNS - (state.currentRun + 1),
  })
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
