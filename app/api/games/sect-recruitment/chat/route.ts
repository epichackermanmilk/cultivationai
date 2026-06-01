// POST /api/games/sect-recruitment/chat  (streaming)
// Handles the interview conversation. The applicant speaks in character.
// Max 2 questions per applicant. No per-turn token charge (flat fee already paid).

import { NextResponse }   from 'next/server'
import { cookies }        from 'next/headers'
import { createClient }   from '@supabase/supabase-js'
import OpenAI             from 'openai'
import { parseJsonBody, sanitizeText } from '@/lib/sanitize'
import { ARCHETYPES, SECT_PRESETS }    from '@/lib/games/archetypes'

const MAX_QUESTIONS = 3

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const token = cookieStore.get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Sign in to play' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  // ── Parse ──────────────────────────────────────────────────────────────────
  const parsed = await parseJsonBody(req, 2048)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const body = parsed.data as Record<string, unknown>
  const sessionId = sanitizeText(body.sessionId, 64)
  const message   = sanitizeText(body.message,   800)
  if (!sessionId || !message) return NextResponse.json({ error: 'sessionId and message required' }, { status: 400 })

  // ── Load session ───────────────────────────────────────────────────────────
  const { data: row } = await sb
    .from('game_sessions')
    .select('id, user_id, state')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!row) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const state = row.state as {
    phase: string; presetId: string; currentIndex: number;
    applicants: Array<{
      archetypeId: string; displayName: string; age: number; hometown: string;
      appearance: string; background: string; cultivation: string; openingStatement: string;
      questionsAsked: number; affinity: number; decision: string | null;
      messages: { role: 'user' | 'assistant'; content: string }[]
    }>
  }

  if (state.phase !== 'interview') {
    return NextResponse.json({ error: 'Recruitment phase is over' }, { status: 400 })
  }

  const applicant = state.applicants[state.currentIndex]
  if (!applicant) return NextResponse.json({ error: 'No current applicant' }, { status: 400 })
  if (applicant.decision !== null) return NextResponse.json({ error: 'Already decided on this applicant' }, { status: 400 })

  if (applicant.questionsAsked >= MAX_QUESTIONS) {
    return NextResponse.json({ error: 'Question limit reached — make your decision', code: 'LIMIT_REACHED' }, { status: 400 })
  }

  // ── Build system prompt ────────────────────────────────────────────────────
  const arch   = ARCHETYPES.find(a => a.id === applicant.archetypeId)
  const preset = SECT_PRESETS.find(p => p.id === state.presetId) ?? SECT_PRESETS[0]

  // Hints guide the voice, not the content — applicant stays in disguise
  const voiceHints = arch?.hints.slice(0, 2).join('; ') ?? ''

  const systemPrompt = `You are roleplaying as ${applicant.displayName}, a cultivation sect applicant.

Your background: ${applicant.background}
Your appearance: ${applicant.appearance}
Your cultivation: ${applicant.cultivation}
Your hometown: ${applicant.hometown}, age ${applicant.age}

Voice & personality guidance (do NOT reveal this directly): ${voiceHints}

Context: You are being interviewed by an elder of ${preset.name}. ${preset.flavor}

Rules:
- Speak entirely as this character. Never break character.
- Keep responses concise: 2-4 sentences. This is an interview, not a monologue.
- Do not reveal your hidden nature, but let subtle hints colour your words naturally.
- Respond to the elder's question directly. Show personality.
- Do not mention game mechanics.`

  const history = applicant.messages.slice(-4).map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // ── Stream response ────────────────────────────────────────────────────────
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ],
    stream: true,
    temperature: 0.85,
    max_tokens: 200,
  })

  // Collect full response to save to state
  let fullResponse = ''
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        if (text) {
          fullResponse += text
          controller.enqueue(encoder.encode(text))
        }
      }
      controller.close()

      // Persist updated messages + question count
      const updatedApplicants = [...state.applicants]
      updatedApplicants[state.currentIndex] = {
        ...applicant,
        questionsAsked: applicant.questionsAsked + 1,
        messages: [
          ...applicant.messages,
          { role: 'user' as const,      content: message      },
          { role: 'assistant' as const, content: fullResponse },
        ],
      }
      await sb
        .from('game_sessions')
        .update({ state: { ...state, applicants: updatedApplicants } })
        .eq('id', sessionId)
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type':  'text/plain; charset=utf-8',
      'X-Questions-Left': String(MAX_QUESTIONS - applicant.questionsAsked - 1),
      'Transfer-Encoding': 'chunked',
    },
  })
}
