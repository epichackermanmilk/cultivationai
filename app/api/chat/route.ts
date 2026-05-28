import OpenAI from 'openai'
import { matchChunks } from '@/lib/supabase'
import { parseJsonBody, sanitizeText } from '@/lib/sanitize'
import { NextResponse } from 'next/server'
import { appendFileSync } from 'fs'
import { join } from 'path'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

const USAGE_LOG = join(process.cwd(), '..', 'output', 'api_usage.log')

function logUsage(slug: string, inputTokens: number, outputTokens: number) {
  try {
    const line = JSON.stringify({
      ts:    new Date().toISOString(),
      slug,
      input_tokens:  inputTokens,
      output_tokens: outputTokens,
      // gpt-4o-mini pricing: $0.15/1M input, $0.60/1M output
      cost_usd: (inputTokens * 0.15 + outputTokens * 0.60) / 1_000_000,
    }) + '\n'
    appendFileSync(USAGE_LOG, line)
  } catch { /* non-fatal */ }
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  // ── Auth check ─────────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const token = cookieStore.get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Sign in to use chat' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Session expired — please sign in again' }, { status: 401 })

  // ── Token balance check ────────────────────────────────────────────────────
  const { data: profile } = await sb
    .from('profiles')
    .select('tokens')
    .eq('id', user.id)
    .single()

  const CHAT_COST = 10
  if (!profile || profile.tokens < CHAT_COST) {
    return NextResponse.json(
      { error: 'Not enough tokens — visit the shop to get more.', code: 'INSUFFICIENT_TOKENS' },
      { status: 402 },
    )
  }

  // ── Parse & validate ───────────────────────────────────────────────────────
  const parsed = await parseJsonBody(req, 8_192)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const body          = parsed.data as Record<string, unknown>
  const slug          = sanitizeText(body.slug,          100)
  const title         = sanitizeText(body.title,         200)
  const author        = sanitizeText(body.author,        200)
  const message       = sanitizeText(body.message,       1000)
  const characterName = sanitizeText(body.characterName, 80)   // optional — enables roleplay mode

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
  // In character mode, bias the embedding query toward that character so we
  // retrieve passages where they appear rather than generic topic matches.
  const embeddingQuery = characterName
    ? `${characterName} ${message}`
    : message

  const embRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: embeddingQuery,
  })
  const queryEmbedding = embRes.data[0].embedding
  const chunks = await matchChunks(queryEmbedding, slug, 6)

  if (chunks.length === 0) {
    const notFoundMsg = characterName
      ? `*${characterName} looks around, puzzled.* I'm afraid I can't recall anything about that — try asking me something else.`
      : "I don't have enough information from this novel to answer that question. Try asking about specific characters, events, or plot points."
    return new Response(notFoundMsg, { headers: { 'Content-Type': 'text/plain' } })
  }

  const context = chunks
    .map(c => `[Ch.${c.chapter_number} — ${c.chapter_title}]\n${c.text}`)
    .join('\n\n---\n\n')

  // ── Build system prompt (book assistant OR character roleplay) ─────────────
  const systemPrompt = characterName
    ? `You are ${characterName}, a character from the novel "${title}" by ${author}.

ROLEPLAY RULES — follow these exactly:
1. Speak entirely in first person as ${characterName}. Never say you are an AI.
2. Use the personality, speech patterns, knowledge, and emotions ${characterName} shows in the story.
3. You only know what ${characterName} would know at the point referenced in the passages below.
4. If asked about events you haven't witnessed, say so in character (e.g. "I wasn't there for that…").
5. If asked something completely outside the story world, stay in character and react as ${characterName} would.
6. Keep responses conversational — 2–5 sentences unless the question calls for more.
7. Occasional italicised action cues (like *${characterName} smiles*) are allowed for flavour.

Story passages featuring ${characterName}:
${context}`
    : `You are an AI assistant for readers of the novel "${title}" by ${author}.
Answer questions using ONLY the passages provided below. Be specific and reference chapter details when relevant.
If something isn't covered in the passages, say so honestly rather than guessing.

Relevant passages:
${context}`

  const stream = await openai.chat.completions.create({
    model:          'gpt-4o-mini',
    stream:         true,
    stream_options: { include_usage: true },
    max_tokens:     800,
    temperature:    characterName ? 0.7 : 0.3,  // more expressive in roleplay mode
    messages:    [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user',   content: message },
    ],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      let streamOk = false
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) {
            controller.enqueue(encoder.encode(text))
          }
          // Log final usage from the last chunk which carries usage stats
          if (chunk.usage) {
            logUsage(slug, chunk.usage.prompt_tokens, chunk.usage.completion_tokens)
          }
        }
        streamOk = true
      } finally {
        controller.close()
        // Deduct 1 token only when the stream completed successfully.
        // The .gte('tokens', 1) guard makes this atomic — prevents going negative
        // if two requests race on the same account.
        if (streamOk) {
          try {
            await sb
              .from('profiles')
              .update({ tokens: profile.tokens - CHAT_COST })
              .eq('id', user.id)
              .gte('tokens', CHAT_COST)
          } catch { /* non-fatal — usage already logged */ }
        }
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type':       'text/plain; charset=utf-8',
      'X-Tokens-Remaining': String(profile.tokens - CHAT_COST),
    },
  })
}
