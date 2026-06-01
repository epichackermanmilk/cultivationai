// POST /api/chat/multi — multi-novel chat.
// RAG-retrieves passages from EACH selected novel and answers questions that
// span all of them at once. Streams the answer; charges 15 tokens on success.

import OpenAI            from 'openai'
import { matchChunks }   from '@/lib/supabase'
import { parseJsonBody, sanitizeText } from '@/lib/sanitize'
import { NextResponse }  from 'next/server'
import { cookies }       from 'next/headers'
import { createClient }  from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const MULTI_CHAT_COST = 15
const MAX_NOVELS = 6
const CHUNKS_PER_NOVEL = 4

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const token = cookieStore.get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Sign in to use chat' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Session expired — please sign in again' }, { status: 401 })

  // ── Token balance ───────────────────────────────────────────────────────────
  const { data: profile } = await sb.from('profiles').select('tokens').eq('id', user.id).single()
  if (!profile || profile.tokens < MULTI_CHAT_COST) {
    return NextResponse.json(
      { error: `Not enough tokens — multi-novel chat costs ${MULTI_CHAT_COST}. Visit the shop to get more.`, code: 'INSUFFICIENT_TOKENS' },
      { status: 402 },
    )
  }

  // ── Parse ─────────────────────────────────────────────────────────────────────
  const parsed = await parseJsonBody(req, 8192)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const body = parsed.data as Record<string, unknown>

  const message = sanitizeText(body.message, 1000)
  if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 })

  const novelsIn = Array.isArray(body.novels) ? body.novels.slice(0, MAX_NOVELS) : []
  const novels = novelsIn
    .map(n => ({
      slug:  sanitizeText((n as Record<string, unknown>).slug, 100),
      title: sanitizeText((n as Record<string, unknown>).title, 200),
    }))
    .filter(n => n.slug)
  if (novels.length === 0) {
    return NextResponse.json({ error: 'Select at least one novel' }, { status: 400 })
  }

  const rawHistory = Array.isArray(body.history) ? body.history.slice(-8) : []
  const history: OpenAI.Chat.ChatCompletionMessageParam[] = rawHistory
    .filter((m): m is { role: string; content: string } =>
      typeof m === 'object' && m !== null &&
      (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role as 'user' | 'assistant', content: sanitizeText(m.content, 2000) }))

  // ── Embed once, retrieve per novel ──────────────────────────────────────────
  const embRes = await openai.embeddings.create({ model: 'text-embedding-3-small', input: message })
  const queryEmbedding = embRes.data[0].embedding

  const perNovel = await Promise.all(novels.map(async n => {
    try {
      const chunks = await matchChunks(queryEmbedding, n.slug, CHUNKS_PER_NOVEL)
      return { title: n.title || n.slug, chunks }
    } catch {
      return { title: n.title || n.slug, chunks: [] }
    }
  }))

  const withContent = perNovel.filter(p => p.chunks.length > 0)
  if (withContent.length === 0) {
    const msg = "I couldn't find relevant passages in the selected novels. Some of them may not be unlocked yet — open each on its novel page (it's free) so I can read it, then try again."
    return new Response(msg, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }

  // Build a clearly-labelled, per-novel context block
  const context = withContent.map(p =>
    `## ${p.title}\n` +
    p.chunks.map(c => `[Ch.${c.chapter_number}${c.chapter_title ? ` — ${c.chapter_title}` : ''}] ${c.text}`).join('\n\n')
  ).join('\n\n———\n\n')

  const novelList = withContent.map(p => `"${p.title}"`).join(', ')

  const systemPrompt = `You are NovelCodex, an AI assistant that answers questions spanning MULTIPLE web novels at once.
The reader has selected these novels: ${novelList}.

Answer using ONLY the passages provided below, which are grouped by novel. When a question compares novels (power scaling, characters, cultivation systems, themes), draw on the relevant novels and make the comparison explicit. Always attribute facts to the specific novel they come from.

If the passages don't cover something, say so honestly rather than guessing. Be specific and cite chapter details when useful.

Passages (grouped by novel):
${context}`

  const stream = await openai.chat.completions.create({
    model:          'gpt-4o-mini',
    stream:         true,
    stream_options: { include_usage: true },
    max_tokens:     900,
    temperature:    0.4,
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      let ok = false
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) controller.enqueue(encoder.encode(text))
        }
        ok = true
      } finally {
        controller.close()
        if (ok) {
          try {
            await sb.from('profiles')
              .update({ tokens: profile.tokens - MULTI_CHAT_COST })
              .eq('id', user.id)
              .gte('tokens', MULTI_CHAT_COST)
          } catch { /* non-fatal */ }
        }
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type':       'text/plain; charset=utf-8',
      'X-Tokens-Remaining': String(profile.tokens - MULTI_CHAT_COST),
    },
  })
}
