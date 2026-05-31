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

  const systemPrompt = `You are narrating a xianxia regression story. This is Life ${state.currentRun} of the player's regression.

## World
${state.worldContext}

## The Great Disaster
${state.disaster.name}: ${state.disaster.description}
Days until disaster: ${MAX_TURNS - turn + 1} (currently Day ${turn} of ${MAX_TURNS})
Hint the player knows: "${state.disaster.hint}"
${pastRunSection}
## Recent Events
${recentTurns || 'This is the start of this life.'}

## Rules
1. Narrate the RESULT of the player's action in 3-5 sentences. Be specific and vivid.
2. Xianxia style: cultivation terms, political intrigue, spiritual sense, qi fluctuations.
3. Each turn should advance the story and give the player meaningful information.
4. If the action leads to the player's death: end with exactly [DEATH: brief reason].
5. If the player prevents the disaster: end with exactly [VICTORY: how they stopped it].
6. If disaster day arrives (Day ${MAX_TURNS}) without prevention: end with exactly [DISASTER].
7. Otherwise: end with a choice or cliffhanger that invites the next action.
8. DO NOT resolve the disaster unless the player takes a specific, logically correct action.`

  // ── Stream response ────────────────────────────────────────────────────────
  const stream = await openai.chat.completions.create({
    model:  'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: `Day ${turn}. My action: ${action}` },
    ],
    stream:      true,
    temperature: 0.85,
    max_tokens:  350,
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
