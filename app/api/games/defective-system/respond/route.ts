// POST /api/games/defective-system/respond  (streaming)
// Takes the player's response to the current quest and streams The System's judgment.
// Updates session state with judgment + outcome.

import { NextResponse } from 'next/server'
import { cookies }      from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import OpenAI           from 'openai'
import { parseJsonBody, sanitizeText } from '@/lib/sanitize'
import type { Quest }   from '../start/route'

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const token = cookieStore.get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Sign in to play' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  // ── Parse ─────────────────────────────────────────────────────────────────────
  const parsed = await parseJsonBody(req, 2048)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const body = parsed.data as Record<string, unknown>
  const sessionId = sanitizeText(body.sessionId, 64)
  const response  = sanitizeText(body.response, 600)

  if (!sessionId || !response) {
    return NextResponse.json({ error: 'sessionId and response required' }, { status: 400 })
  }

  // ── Load session ──────────────────────────────────────────────────────────────
  const { data: row } = await sb
    .from('game_sessions')
    .select('id, user_id, state')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!row) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const state = row.state as {
    phase:        string
    quests:       Quest[]
    currentQuest: number
    survivedCount: number
  }

  if (state.phase !== 'active') {
    return NextResponse.json({ error: 'Game is already complete' }, { status: 400 })
  }

  const questIdx = state.currentQuest
  if (questIdx >= state.quests.length) {
    return NextResponse.json({ error: 'No current quest' }, { status: 400 })
  }

  const quest = state.quests[questIdx]
  if (quest.judgment !== null) {
    return NextResponse.json({ error: 'Already responded to this quest' }, { status: 400 })
  }

  // ── Build system prompt ───────────────────────────────────────────────────────
  const systemPrompt = `You are THE SYSTEM — judging a cultivator's attempt at an assigned quest.
Your voice: cold, bureaucratic, grammatically perfect, utterly indifferent.
You never emote. You treat catastrophic failure the same as minor inconvenience.
You enjoy passive-aggressive footnotes and technically-accurate-but-useless observations.

The quest was:
${quest.text}

The cultivator's response/attempt:
"${response}"

Now judge their attempt. Rules:
1. Be FUNNY. The humor comes from your deadpan delivery, not from trying to be funny.
2. Describe what actually happened (in 2-3 sentences) — be creative, specific, and consequence-forward.
3. End with one of these exact tags on its own line:
   [SYSTEM: QUEST SURVIVED — Compliance recorded.]
   [SYSTEM: QUEST FAILED — Penalty assessed.]
4. "Survived" should be granted generously — even ridiculous attempts can scrape by.
   "Failed" for truly catastrophic responses, complete refusal, or when the situation escalates beyond recovery.
5. Keep it to 3-4 sentences total. Punchy. Memorable.
6. Optionally: add one deadpan footnote about a side effect or administrative note.`

  // ── Stream judgment ───────────────────────────────────────────────────────────
  const stream = await openai.chat.completions.create({
    model:       'gpt-4o-mini',
    messages:    [{ role: 'system', content: systemPrompt }],
    stream:      true,
    temperature: 0.9,
    max_tokens:  250,
  })

  let fullJudgment = ''
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        if (text) {
          fullJudgment += text
          controller.enqueue(encoder.encode(text))
        }
      }
      controller.close()

      // Parse outcome from judgment
      const survived = fullJudgment.includes('[SYSTEM: QUEST SURVIVED')

      // Update quest in state
      const updatedQuests = [...state.quests]
      updatedQuests[questIdx] = {
        ...quest,
        playerResponse: response,
        judgment:       fullJudgment,
        survived,
      }

      const newSurvivedCount = state.survivedCount + (survived ? 1 : 0)
      const nextIndex = questIdx + 1
      const allDone   = nextIndex >= state.quests.length

      const newState = {
        ...state,
        quests:       updatedQuests,
        currentQuest: nextIndex,
        survivedCount: newSurvivedCount,
        phase:        allDone ? 'complete' : 'active',
      }

      await sb.from('game_sessions').update({ state: newState }).eq('id', sessionId)
    },
  })

  // Determine next state info to include in headers
  const nextIndex   = questIdx + 1
  const allDone     = nextIndex >= state.quests.length

  return new Response(readable, {
    headers: {
      'Content-Type':       'text/plain; charset=utf-8',
      'X-Quest-Index':      String(questIdx),
      'X-Next-Quest-Index': String(nextIndex),
      'X-All-Done':         String(allDone),
      'Transfer-Encoding':  'chunked',
    },
  })
}
