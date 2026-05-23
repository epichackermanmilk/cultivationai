import OpenAI from 'openai'
import { matchChunks } from '@/lib/supabase'
import { parseJsonBody, sanitizeText } from '@/lib/sanitize'
import { NextResponse } from 'next/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  // ── Parse & validate ───────────────────────────────────────────────────────
  const parsed = await parseJsonBody(req, 8_192)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const body    = parsed.data as Record<string, unknown>
  const slug    = sanitizeText(body.slug,    100)
  const title   = sanitizeText(body.title,   200)
  const author  = sanitizeText(body.author,  200)
  const message = sanitizeText(body.message, 1000)

  if (!slug || !message) {
    return NextResponse.json({ error: 'slug and message are required' }, { status: 400 })
  }

  // Sanitize and limit history
  const rawHistory = Array.isArray(body.history) ? body.history.slice(-8) : []
  const history: OpenAI.Chat.ChatCompletionMessageParam[] = rawHistory
    .filter((m): m is { role: string; content: string } =>
      typeof m === 'object' && m !== null &&
      (m.role === 'user' || m.role === 'assistant') &&
      typeof m.content === 'string'
    )
    .map(m => ({
      role:    m.role as 'user' | 'assistant',
      content: sanitizeText(m.content, 2000),
    }))

  // ── Embed & retrieve ───────────────────────────────────────────────────────
  const embRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: message,
  })
  const queryEmbedding = embRes.data[0].embedding
  const chunks = await matchChunks(queryEmbedding, slug, 6)

  if (chunks.length === 0) {
    return new Response(
      "I don't have enough information from this novel to answer that question. Try asking about specific characters, events, or plot points.",
      { headers: { 'Content-Type': 'text/plain' } },
    )
  }

  const context = chunks
    .map(c => `[Ch.${c.chapter_number} — ${c.chapter_title}]\n${c.text}`)
    .join('\n\n---\n\n')

  // ── Stream ─────────────────────────────────────────────────────────────────
  const systemPrompt = `You are an AI assistant for readers of the novel "${title}" by ${author}.
Answer questions using ONLY the passages provided below. Be specific and reference chapter details when relevant.
If something isn't covered in the passages, say so honestly rather than guessing.

Relevant passages:
${context}`

  const stream = await openai.chat.completions.create({
    model:       'gpt-4o-mini',
    stream:      true,
    max_tokens:  800,
    temperature: 0.3,
    messages:    [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user',   content: message },
    ],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        if (text) controller.enqueue(encoder.encode(text))
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
