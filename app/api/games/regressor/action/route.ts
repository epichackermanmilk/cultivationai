// POST /api/games/regressor/action  (streaming)
// Player submits an action for the current turn. AI narrates the result.
// Returns headers: X-Turn, X-Max-Turns, X-Phase (active|run_end|victory)

import { NextResponse } from 'next/server'
import { cookies }      from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import OpenAI           from 'openai'
import { parseJsonBody, sanitizeText } from '@/lib/sanitize'
import type { RegressorState }         from '../start/route'

const MAX_TURNS = 30

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

  const parsed = await parseJsonBody(req, 2048)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const body      = parsed.data as Record<string, unknown>
  const sessionId = sanitizeText(body.sessionId, 64)
  const action    = sanitizeText(body.action, 800)

  if (!sessionId || !action) return NextResponse.json({ error: 'sessionId and action required' }, { status: 400 })

  const { data: row } = await sb
    .from('game_sessions')
    .select('id, user_id, state')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!row) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const state = row.state as RegressorState
  if (state.phase !== 'active') return NextResponse.json({ error: 'Not in active phase' }, { status: 400 })

  const turn = state.currentTurn

  // ── Build system prompt ────────────────────────────────────────────────────
  const pastRunSection = state.pastRuns.length > 0
    ? `\n## Memories from Past Lives\n${state.pastRuns.map(r =>
        `**Life ${r.runNumber}** (reached Day ${r.turnsReached}): ${r.lessonsLearned}`
      ).join('\n')}\n`
    : ''

  const recentTurns = state.turns.slice(-6).map(t =>
    `Day ${t.turn}: [Action: ${t.action}]\n${t.narration}`
  ).join('\n\n')

  const powerSection = state.regressorPower
    ? `\n## Your Regressor's Power (carried from a past life)\n${state.regressorPower.name}: ${state.regressorPower.description}\nDrawback: ${state.regressorPower.drawback}\nThe player may invoke this power, but it is NOT a free win — enforce the drawback every time, and it cannot trivially solve a lethal trap.\n`
    : ''

  const systemPrompt = `You are narrating a HARD xianxia regression story. This is Life ${state.currentRun} of the player's regression. The fun comes from a real power fantasy gated behind genuine danger: dying, learning the hidden rules, and coming back sharper.

## World
${state.worldContext}

## The Great Disaster
${state.disaster.name}: ${state.disaster.description}
Days until disaster: ${MAX_TURNS - turn + 1} (currently Day ${turn} of ${MAX_TURNS})
Hint the player knows: "${state.disaster.hint}"
${powerSection}${pastRunSection}
## Recent Events
${recentTurns || 'This is the start of this life.'}

## Rules
1. Narrate the RESULT of the player's action vividly (one tight paragraph). Xianxia style: cultivation realms, factions, spiritual sense, qi, intrigue.
2. THIS WORLD IS LETHAL AND DOES NOT HOLD HANDS. Reckless, arrogant, uninformed, or careless actions can get the player killed SUDDENLY — including hidden traps, ambushes, poison, betrayal, or forbidden ground they had no way to know was deadly the first time. Do NOT telegraph every danger. Some doors kill.
3. BUT always be FAIR, never random: every death must, in hindsight, have a cause the player can now learn from and avoid next life. The death reason should reveal a concrete piece of hidden information ("the third elder was the traitor", "the eastern path is warded with a soul-trap"). This is the core loop — death → knowledge → progress.
4. Reward decisive, observant, information-driven play with real, satisfying progress and power — let the player FEEL clever and strong when they earn it.
5. Use the player's past-life memories and Regressor's Power where relevant, honoring its drawback.
6. If the action leads to death: end with exactly [DEATH: specific reason that teaches a lesson].
7. If the player prevents the disaster through a specific, logically correct action: end with exactly [VICTORY: how].
8. If Day ${MAX_TURNS} arrives without prevention: end with exactly [DISASTER].
9. Otherwise end with a sharp choice or cliffhanger. Do NOT resolve the disaster unless the action genuinely earns it.`

  // ── Stream response ────────────────────────────────────────────────────────
  const stream = await openai.chat.completions.create({
    model:  'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: `Day ${turn}. My action: ${action}` },
    ],
    stream:      true,
    temperature: 0.9,
    max_tokens:  700,
  })

  let fullText = ''
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        if (text) { fullText += text; controller.enqueue(encoder.encode(text)) }
      }
      controller.close()

      // ── Parse outcome ──────────────────────────────────────────────────────
      const isDeath   = /\[DEATH:/i.test(fullText)
      const isVictory = /\[VICTORY:/i.test(fullText)
      const isDisaster = /\[DISASTER\]/i.test(fullText)
      const runEnds   = isDeath || isVictory || isDisaster || turn >= MAX_TURNS

      // Add turn to history
      const updatedTurns = [...state.turns, { turn, action, narration: fullText }]

      let newState: RegressorState
      if (isVictory) {
        newState = { ...state, turns: updatedTurns, phase: 'victory', currentTurn: turn }
      } else if (runEnds) {
        const endReason = isDeath ? 'death' : isDisaster ? 'disaster' : 'time_expired'
        newState = {
          ...state,
          turns:       updatedTurns,
          phase:       'run_end',
          currentTurn: turn,
          runEndReason: endReason,
        }
      } else {
        newState = { ...state, turns: updatedTurns, currentTurn: turn + 1 }
      }

      await sb.from('game_sessions').update({ state: newState }).eq('id', sessionId)
    },
  })

  const isDeath   = false  // will be computed post-stream; headers are advisory
  const nextTurn  = turn + 1
  const phase     = 'active'  // client re-checks after stream completes

  return new Response(readable, {
    headers: {
      'Content-Type':      'text/plain; charset=utf-8',
      'X-Turn':            String(turn),
      'X-Next-Turn':       String(nextTurn),
      'X-Max-Turns':       String(MAX_TURNS),
      'Transfer-Encoding': 'chunked',
    },
  })
}
