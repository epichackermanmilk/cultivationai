import OpenAI from 'openai'
import { matchChunks } from '@/lib/supabase'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  const { slug, title, author, message, history = [] } = await req.json()

  // 1. Embed the user query
  const embRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: message,
  })
  const queryEmbedding = embRes.data[0].embedding

  // 2. Retrieve relevant chunks from Supabase
  const chunks = await matchChunks(queryEmbedding, slug, 6)

  if (chunks.length === 0) {
    return new Response(
      "I don't have enough information from this novel to answer that question. Try asking about specific characters, events, or plot points.",
      { headers: { 'Content-Type': 'text/plain' } }
    )
  }

  const context = chunks
    .map(c => `[Ch.${c.chapter_number} — ${c.chapter_title}]\n${c.text}`)
    .join('\n\n---\n\n')

  // 3. Stream a response
  const systemPrompt = `You are an AI assistant for readers of the novel "${title}" by ${author}.
Answer questions using ONLY the passages provided below. Be specific and reference chapter details when relevant.
If something isn't covered in the passages, say so honestly rather than guessing.

Relevant passages:
${context}`

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-8),
    { role: 'user', content: message },
  ]

  const stream = await openai.chat.completions.create({
    model:       'gpt-4o-mini',
    stream:      true,
    max_tokens:  800,
    temperature: 0.3,
    messages,
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
