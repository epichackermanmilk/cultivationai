import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { sanitizeText } from '@/lib/sanitize'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ── POST /api/summarize ───────────────────────────────────────────────────────
// Summarises a roleplay conversation's older messages into a compact paragraph
// so the character retains memory beyond the 8-message sliding window.
// No tokens are charged — this is a background quality improvement, not a user action.
export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const token = cookieStore.get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: {
    messages?:      unknown
    characterName?: unknown
    novelTitle?:    unknown
  }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const characterName = sanitizeText(body.characterName, 80)
  const novelTitle    = sanitizeText(body.novelTitle,    200)

  if (!characterName) {
    return NextResponse.json({ error: 'characterName is required' }, { status: 400 })
  }

  // Validate messages — accept up to 40 messages to summarise
  const rawMessages = Array.isArray(body.messages) ? body.messages.slice(0, 40) : []
  const messages = rawMessages
    .filter((m): m is { role: string; content: string } =>
      typeof m === 'object' && m !== null &&
      (m.role === 'user' || m.role === 'assistant') &&
      typeof m.content === 'string' && m.content.trim().length > 0
    )
    .map(m => ({
      role:    m.role as 'user' | 'assistant',
      content: sanitizeText(m.content, 1000),
    }))

  if (messages.length < 4) {
    // Not enough to summarise — return empty so caller keeps using raw history
    return NextResponse.json({ summary: '' })
  }

  // ── Format messages for the summarisation prompt ───────────────────────────
  const transcript = messages
    .map(m => `${m.role === 'user' ? 'Reader' : characterName}: ${m.content}`)
    .join('\n')

  const prompt = `You are summarising a roleplay conversation between a reader and ${characterName} (from "${novelTitle}"). Write a compact 3–5 sentence memory note for ${characterName} to carry into future replies.

Include:
- Key facts the reader shared (their name, preferences, questions asked, opinions expressed)
- How ${characterName} described themselves, their past, or their feelings in this conversation
- Any significant emotional moments or commitments made
- The general tone and relationship dynamic established

Write in third person, as a note FOR ${characterName}, not as ${characterName} speaking. Be specific — avoid generic summaries.

Transcript:
${transcript}

Memory note (3–5 sentences, plain text, no headers):`

  try {
    const completion = await openai.chat.completions.create({
      model:       'gpt-4o-mini',
      temperature: 0.2,
      max_tokens:  250,
      messages:    [{ role: 'user', content: prompt }],
    })
    const summary = (completion.choices[0].message.content ?? '').trim()
    return NextResponse.json({ summary })
  } catch {
    return NextResponse.json({ error: 'Summarisation failed' }, { status: 502 })
  }
}
