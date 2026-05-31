// POST /api/games/survival/action  (streaming)
// Player acts in the novel world. RAG pulls relevant chapter context.

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

  const state = row.state as SurvivalState
  if (state.phase !== 'active') return NextResponse.json({ error: 'Not in active phase' }, { status: 400 })

  const turn = state.currentTurn

  // RAG — pull novel context relevant to current situation
  let chapterContext = ''
  try {
    // Pull chunks from the arc range, weighted toward current narrative position
    const progress = (turn - 1) / state.maxTurns
    const targetChapter = Math.floor(state.chapterFrom + progress * (state.chapterTo - state.chapterFrom))
    const windowFrom = Math.max(state.chapterFrom, targetChapter - 5)
    const windowTo   = Math.min(state.chapterTo, targetChapter + 15)

    const { data: chunks } = await sb
      .from('novel_chunks')
      .select('text, chapter_number')
      .eq('slug', state.novelSlug)
      .gte('chapter_number', windowFrom)
      .lte('chapter_number', windowTo)
      .order('chapter_number', { ascending: true })
      .limit(5)

    if (chunks && chunks.length > 0) {
      chapterContext = `\n## Novel Events Reference (chapters ${windowFrom}-${windowTo})\n` +
        chunks.map(c => `[Ch. ${c.chapter_number}] ${c.text.slice(0, 350)}`).join('\n\n')
    }
  } catch { /* non-fatal — narrate without RAG */ }

  const recentHistory = state.turns.slice(-5).map(t =>
    `Turn ${t.turn}: [${t.action}]\n${t.narration}`
  ).join('\n\n')

  const systemPrompt = `You are narrating an immersive xianxia survival story.
The player has transmigrated into "${state.novelTitle}" and is living as ${state.player.name}.

## Player Identity
Name: ${state.player.name}
Background: ${state.player.background}
Cultivation: ${state.player.cultivationLevel}
Role: ${state.player.startingPosition}

## Arc
${state.arcLabel} (chapters ${state.chapterFrom}-${state.chapterTo})
Turn ${turn} of ${state.maxTurns}
${chapterContext}

## Recent Events
${recentHistory || 'This is the opening turn.'}

## Narration Rules
1. Write 3-5 sentences narrating the RESULT of the player's action.
2. Stay faithful to the novel's lore, power system, and character names/personalities.
3. The player is a SIDE CHARACTER — canon characters may appear and interact with them, but the main plot should proceed in the background.
4. If the player does something that would get them killed by the setting's logic (challenges someone vastly stronger, breaks a major law, etc.): end with [DEATH: reason].
5. If they survive all ${state.maxTurns} turns (turn ${state.maxTurns}): end with [SURVIVED].
6. Otherwise: end with a new situation or choice.
7. Second person ("You..."). Xianxia atmospheric style.`

  const stream = await openai.chat.completions.create({
    model:  'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: `Turn ${turn}. My action: ${action}` },
    ],
    stream:      true,
    temperature: 0.82,
    max_tokens:  300,
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

      const isDead    = /\[DEATH:/i.test(fullText)
      const isSurvive = /\[SURVIVED\]/i.test(fullText)
      const runEnds   = isDead || isSurvive || turn >= state.maxTurns

      const updatedTurns = [...state.turns, { turn, action, narration: fullText }]
      let newPhase: SurvivalState['phase'] = 'active'
      if (isSurvive) newPhase = 'survived'
      else if (isDead || turn >= state.maxTurns) newPhase = 'dead'

      const newState: SurvivalState = {
        ...state,
        turns:       updatedTurns,
        currentTurn: runEnds ? turn : turn + 1,
        phase:       newPhase,
        deathReason: isDead
          ? (fullText.match(/\[DEATH:\s*([^\]]+)\]/i)?.[1] ?? 'unknown')
          : null,
      }
      await sb.from('game_sessions').update({ state: newState }).eq('id', sessionId)
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type':      'text/plain; charset=utf-8',
      'X-Turn':            String(turn),
      'X-Max-Turns':       String(state.maxTurns),
      'Transfer-Encoding': 'chunked',
    },
  })
}
