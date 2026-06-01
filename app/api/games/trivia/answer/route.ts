// POST /api/games/trivia/answer
// Judges the player's answer with fuzzy matching (typos/partial = credit, with a
// correction; way off = no credit). Advances to the next question.

import { NextResponse } from 'next/server'
import { cookies }      from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import OpenAI           from 'openai'
import { parseJsonBody, sanitizeText } from '@/lib/sanitize'
import type { TriviaState } from '../start/route'

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function grade(pct: number): string {
  if (pct >= 0.97) return 'S'
  if (pct >= 0.90) return 'A'
  if (pct >= 0.80) return 'B'
  if (pct >= 0.70) return 'C'
  if (pct >= 0.60) return 'D'
  return 'F'
}

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Sign in to play' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  const parsed = await parseJsonBody(req, 1024)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const body      = parsed.data as Record<string, unknown>
  const sessionId = sanitizeText(body.sessionId, 64)
  const answer    = sanitizeText(body.answer, 400) ?? ''
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const { data: row } = await sb
    .from('game_sessions')
    .select('id, user_id, state')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()
  if (!row) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const state = row.state as TriviaState
  if (state.phase !== 'active') return NextResponse.json({ error: 'Quiz already finished' }, { status: 400 })

  const idx = state.currentIndex
  const question = state.questions[idx]
  if (!question || question.correct !== null) {
    return NextResponse.json({ error: 'No active question' }, { status: 400 })
  }

  // ── Judge the answer (fuzzy) ────────────────────────────────────────────────
  let correct = false
  let verdict = 'wrong'
  let feedback = ''

  if (answer.trim()) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'system',
          content: `You are grading a trivia answer for a web-novel quiz. Be lenient with spelling and partial names.

Question: ${question.q}
Correct answer: ${question.answer}
Player's answer: ${answer}

Grading rules:
- If the player's answer clearly refers to the correct answer (even with typos, missing words, or a partial name like "Jone" for "John"), mark it CORRECT.
- If it's a reasonable synonym or the same entity by another name, CORRECT.
- If it's vague, a wild guess, or refers to something else, mark it WRONG.
- "close" = right idea but imperfect; "exact" = spot on; "wrong" = not credited.

Return ONLY JSON:
{ "correct": true/false, "verdict": "exact" | "close" | "wrong", "feedback": "one short sentence; if correct but imperfect, gently correct them; if wrong, state the right answer" }`,
        }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 150,
      })
      const d = JSON.parse(completion.choices[0].message.content ?? '{}')
      correct = !!d.correct
      verdict = d.verdict ?? (correct ? 'close' : 'wrong')
      feedback = d.feedback ?? ''
    } catch (e) {
      console.error('[trivia/answer] judge error:', e)
      // Fallback: simple normalized comparison
      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
      correct = norm(answer).includes(norm(question.answer)) || norm(question.answer).includes(norm(answer))
      verdict = correct ? 'close' : 'wrong'
      feedback = correct ? '' : `The answer was: ${question.answer}.`
    }
  } else {
    feedback = `The answer was: ${question.answer}.`
  }

  // ── Update state ────────────────────────────────────────────────────────────
  const updated = [...state.questions]
  updated[idx] = { ...question, userAnswer: answer, correct, correction: feedback }

  const newCorrect = state.correctCount + (correct ? 1 : 0)
  const nextIndex  = idx + 1
  const done       = nextIndex >= state.questions.length

  const newState: TriviaState = {
    ...state,
    questions:    updated,
    correctCount: newCorrect,
    currentIndex: nextIndex,
    phase:        done ? 'complete' : 'active',
  }
  await sb.from('game_sessions').update({ state: newState }).eq('id', sessionId)

  if (done) {
    const pct = newCorrect / state.questions.length
    return NextResponse.json({
      correct,
      verdict,
      feedback,
      correctAnswer: question.answer,
      done:          true,
      score:         newCorrect,
      total:         state.questions.length,
      grade:         grade(pct),
      review:        updated.map(q => ({
        q: q.q, answer: q.answer, userAnswer: q.userAnswer, correct: q.correct, novelTitle: q.novelTitle,
      })),
    })
  }

  return NextResponse.json({
    correct,
    verdict,
    feedback,
    correctAnswer: question.answer,
    done:          false,
    nextQuestion:  state.questions[nextIndex].q,
    questionIndex: nextIndex,
    total:         state.questions.length,
    correctSoFar:  newCorrect,
  })
}
