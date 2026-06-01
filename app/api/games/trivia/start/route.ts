// POST /api/games/trivia/start
// Cost scales with question count (2 tokens/question). Pulls RAG context from
// the chosen novels and generates all questions up front (answers stored server-side).

import { NextResponse } from 'next/server'
import { cookies }      from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import OpenAI           from 'openai'
import { parseJsonBody, sanitizeText } from '@/lib/sanitize'
import { triggerEmbed } from '@/lib/vps'

const TOKENS_PER_QUESTION = 2
const VALID_COUNTS = [5, 10, 15, 20]
const MAX_NOVELS   = 10
const CHUNKS_PER_NOVEL = 4

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface TriviaQuestion {
  q:          string
  answer:     string
  novelTitle: string
  userAnswer: string | null
  correct:    boolean | null
  correction: string | null
}

export interface TriviaState {
  phase:        'active' | 'complete'
  questionCount: number
  questions:    TriviaQuestion[]
  currentIndex: number
  correctCount: number
}

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Sign in to play' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  const parsed = await parseJsonBody(req, 2048)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const body = parsed.data as Record<string, unknown>

  const questionCount = Number(body.questionCount)
  if (!VALID_COUNTS.includes(questionCount)) {
    return NextResponse.json({ error: 'questionCount must be 5, 10, 15, or 20' }, { status: 400 })
  }

  const novelsIn = Array.isArray(body.novels) ? body.novels.slice(0, MAX_NOVELS) : []
  const novels = novelsIn
    .map(n => ({
      slug:  sanitizeText((n as Record<string, unknown>).slug, 120),
      title: sanitizeText((n as Record<string, unknown>).title, 200),
    }))
    .filter(n => n.slug)
  if (novels.length === 0) {
    return NextResponse.json({ error: 'Pick at least one novel' }, { status: 400 })
  }

  const maxChapter = typeof body.maxChapter === 'number' && body.maxChapter > 0
    ? Math.floor(body.maxChapter) : null

  const cost = questionCount * TOKENS_PER_QUESTION

  // ── Token check + deduct ────────────────────────────────────────────────────
  const { data: profile } = await sb.from('profiles').select('tokens').eq('id', user.id).single()
  if (!profile || profile.tokens < cost) {
    return NextResponse.json(
      { error: `Not enough tokens. This quiz costs ${cost} tokens.`, code: 'INSUFFICIENT_TOKENS' },
      { status: 402 },
    )
  }
  await sb.from('profiles').update({ tokens: profile.tokens - cost }).eq('id', user.id)

  // ── Gather RAG context from the chosen novels ───────────────────────────────
  // Every novel a user picks is, from their POV, available. If we don't yet have
  // its content indexed, we silently kick off indexing in the background and ask
  // them to try again in a moment — no "unlock" step is ever surfaced.
  const contextBlocks: string[] = []
  const indexing: string[] = []
  for (const n of novels) {
    try {
      let q = sb.from('chunks')
        .select('text, chapter_number')
        .eq('slug', n.slug)
        .order('chapter_number', { ascending: true })
        .limit(40)
      if (maxChapter) q = q.lte('chapter_number', maxChapter)
      const { data: chunks } = await q
      if (chunks && chunks.length > 0) {
        // spread across the range, take CHUNKS_PER_NOVEL
        const step = Math.max(1, Math.floor(chunks.length / CHUNKS_PER_NOVEL))
        const picked = []
        for (let i = 0; i < chunks.length && picked.length < CHUNKS_PER_NOVEL; i += step) picked.push(chunks[i])
        contextBlocks.push(
          `### Novel: ${n.title}\n` +
          picked.map(c => `[Ch.${c.chapter_number}] ${c.text.slice(0, 450)}`).join('\n')
        )
      } else {
        // No content yet — start indexing silently.
        indexing.push(n.title || n.slug)
        triggerEmbed(n.slug).catch(() => {})
      }
    } catch {
      indexing.push(n.title || n.slug)
      triggerEmbed(n.slug).catch(() => {})
    }
  }

  if (contextBlocks.length === 0) {
    // Nothing ready yet — refund and let them retry once indexing finishes.
    await sb.from('profiles').update({ tokens: profile.tokens }).eq('id', user.id)
    const names = indexing.slice(0, 3).join(', ') || 'your novels'
    return NextResponse.json(
      {
        error: `Getting ${names} ready for the first time — this usually takes a minute or two. Try again shortly. (You weren't charged.)`,
        code: 'INDEXING',
      },
      { status: 422 },
    )
  }

  // ── Generate questions ──────────────────────────────────────────────────────
  const systemPrompt = `You are a trivia master for web-novel fans.
Using ONLY the provided novel excerpts, write ${questionCount} trivia questions that test whether a reader truly knows these stories.

Rules:
- Each question must have a SHORT, specific, factual answer (a name, place, technique, number, or event) — not an essay.
- Base every question and answer strictly on the excerpts. Do not invent facts.
- Do NOT reveal which novel a question is from inside the question text.
- Vary difficulty and topic (characters, powers, places, events, relationships).
- Spread questions across the different novels provided.
- Keep questions concise (one sentence).

Return ONLY valid JSON:
{
  "questions": [
    { "q": "question text", "answer": "the correct short answer", "novelTitle": "which novel it came from" }
  ]
}`

  let questions: TriviaQuestion[] = []
  try {
    const completion = await openai.chat.completions.create({
      model:           'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: contextBlocks.join('\n\n').slice(0, 14000) },
      ],
      response_format: { type: 'json_object' },
      temperature:     0.8,
      max_tokens:      1600,
    })
    const d = JSON.parse(completion.choices[0].message.content ?? '{}')
    if (Array.isArray(d.questions)) {
      questions = d.questions.slice(0, questionCount).map((x: { q: string; answer: string; novelTitle: string }) => ({
        q:          x.q ?? '',
        answer:     x.answer ?? '',
        novelTitle: x.novelTitle ?? '',
        userAnswer: null,
        correct:    null,
        correction: null,
      })).filter((x: TriviaQuestion) => x.q && x.answer)
    }
  } catch (e) {
    console.error('[trivia/start] AI error:', e)
    await sb.from('profiles').update({ tokens: profile.tokens }).eq('id', user.id)
    return NextResponse.json({ error: 'Failed to generate quiz. Tokens refunded.' }, { status: 502 })
  }

  if (questions.length < 3) {
    await sb.from('profiles').update({ tokens: profile.tokens }).eq('id', user.id)
    return NextResponse.json({ error: 'Could not generate enough questions. Tokens refunded.' }, { status: 502 })
  }

  const state: TriviaState = {
    phase:         'active',
    questionCount: questions.length,
    questions,
    currentIndex:  0,
    correctCount:  0,
  }

  const { data: session, error: sessionErr } = await sb
    .from('game_sessions')
    .insert({
      user_id:   user.id,
      game_type: 'trivia',
      state,
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    })
    .select('id')
    .single()

  if (sessionErr || !session) {
    await sb.from('profiles').update({ tokens: profile.tokens }).eq('id', user.id)
    return NextResponse.json({ error: 'Failed to start session' }, { status: 500 })
  }

  return NextResponse.json({
    sessionId:     session.id,
    question:      questions[0].q,
    questionIndex: 0,
    total:         questions.length,
  })
}
