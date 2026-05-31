// POST /api/games/survival/regress
// Archives the current (dead) run, resets to turn 1 with fresh situation.
// No token charge — all runs covered by the 150 initial fee.

import { NextResponse } from 'next/server'
import { cookies }      from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import OpenAI           from 'openai'
import { parseJsonBody, sanitizeText } from '@/lib/sanitize'
import type { SurvivalState }         from '../start/route'

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
  const sessionId = sanitizeText((parsed.data as Record<string, unknown>).sessionId, 64)
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const { data: row } = await sb
    .from('game_sessions')
    .select('id, user_id, state')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()
  if (!row) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const state = row.state as SurvivalState
  if (state.phase === 'active') return NextResponse.json({ error: 'Run is still active' }, { status: 400 })

  // Generate a slightly different opening for the new attempt
  let newOpeningNarration = `You find yourself back at the beginning. The same world, the same arc — but this time, you know a little more about how things unfold.`

  if (state.turns.length > 0) {
    try {
      const completion = await openai.chat.completions.create({
        model:       'gpt-4o-mini',
        messages: [{
          role: 'system',
          content: `A player has died in attempt ${state.runNumber} at surviving inside "${state.novelTitle}".
They lived ${state.turns.length} turns before dying: "${state.deathReason}".
Write a 2-3 sentence transmigration opening for their NEXT attempt. Acknowledge the déjà vu of reliving the same arc but with foreknowledge. Second person, xianxia style.`,
        }],
        temperature: 0.85,
        max_tokens:  150,
      })
      newOpeningNarration = completion.choices[0].message.content?.trim() ?? newOpeningNarration
    } catch { /* use default */ }
  }

  const archivedRun = {
    runNumber:    state.runNumber,
    turnsReached: state.turns.length,
    deathReason:  state.deathReason ?? 'unknown',
  }

  const newState: SurvivalState = {
    ...state,
    phase:       'active',
    currentTurn: 1,
    runNumber:   state.runNumber + 1,
    turns:       [],
    deathReason: null,
    pastRuns:    [...state.pastRuns, archivedRun],
  }

  await sb.from('game_sessions').update({ state: newState }).eq('id', sessionId)

  return NextResponse.json({
    openingNarration: newOpeningNarration,
    runNumber:        newState.runNumber,
    pastRuns:         newState.pastRuns,
    player:           newState.player,
  })
}
