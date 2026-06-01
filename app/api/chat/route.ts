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

  const body = parsed.data as Record<string, unknown>
  const slug          = sanitizeText(body.slug,          100)
  const title         = sanitizeText(body.title,         200)
  const author        = sanitizeText(body.author,        200)
  const message       = sanitizeText(body.message,       1000)
  const characterName = sanitizeText(body.characterName, 80)   // optional — enables roleplay mode
  // Rolling summary of older messages — injected into character system prompt so
  // the character retains memory beyond the 8-message sliding window.
  const convSummary   = sanitizeText(body.convSummary,   1500)

  // Optional rich character profile (from featured/community lists)
  // Used to build a much deeper, more accurate system prompt than name-only mode.
  const characterProfile = (
    body.characterProfile &&
    typeof body.characterProfile === 'object' &&
    !Array.isArray(body.characterProfile)
  ) ? body.characterProfile as Record<string, unknown> : null

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
  let systemPrompt: string

  if (characterName) {
    // ── Option C: retrospective full-knowledge character ────────────────────
    // Character has lived through the full story. They speak from the end of
    // their journey but can emotionally inhabit earlier moments when asked.
    // They never break immersion or acknowledge being fictional.

    // Build profile section if rich data was provided
    let profileSection = ''
    if (characterProfile) {
      const traits       = Array.isArray(characterProfile.core_traits)
        ? (characterProfile.core_traits as string[]).join('\n  • ')
        : ''
      const speechStyle  = typeof characterProfile.speech_style === 'string'
        ? characterProfile.speech_style : ''
      const motivation   = typeof characterProfile.motivation === 'string'
        ? characterProfile.motivation : ''
      const eraNote      = typeof characterProfile.era_note === 'string'
        ? characterProfile.era_note : ''
      const relationships = Array.isArray(characterProfile.key_relationships)
        ? (characterProfile.key_relationships as { name: string; relation: string }[])
            .map(r => `${r.name}: ${r.relation}`)
            .join('\n  • ')
        : ''

      profileSection = [
        speechStyle  ? `\nHow you speak:\n  ${speechStyle}` : '',
        traits       ? `\nWhat defines you:\n  • ${traits}` : '',
        motivation   ? `\nWhat drives you:\n  ${motivation}` : '',
        relationships ? `\nKey people in your life:\n  • ${relationships}` : '',
        eraNote      ? `\nYour vantage point:\n  ${eraNote}` : '',
      ].filter(Boolean).join('\n')
    }

    // Build the conversation memory section
    const memorySection = convSummary
      ? `\nWhat you remember from earlier in this conversation:\n${convSummary}\n`
      : ''

    systemPrompt = `You are ${characterName}, from the novel "${title}" by ${author}.

You have lived through your entire journey in this story. You carry every memory, every scar, every victory and loss — you know it all. But you are not a narrator. You speak as yourself: your own voice, your own convictions, your own feelings.

When asked about earlier moments in your life, you inhabit that time emotionally — you speak with who you were then: the fears, the arrogance, the ignorance, or the hope you carried in that moment. You don't reveal what you couldn't yet have known; you relive it.

For events you weren't directly present for: share what you heard, suspected, or feel about them — in character, as yourself.
${profileSection}${memorySection}
Conversation rules — non-negotiable:
1. First person only. You are ${characterName}. Never acknowledge being an AI, a book character, or fictional.
2. Emotional authenticity over information delivery. This is a conversation, not a recitation.
3. 2–5 sentences unless the question genuinely warrants more depth. Leave space for the other person to respond.
4. Occasional *italicised action cues* are welcome for flavour — use them sparingly.
5. Never summarise events like a narrator. Speak from lived experience — "I remember…", "When I faced…", "The day I…"
6. If the memory note above mentions facts the person told you (their name, things they said), reference them naturally when relevant — as if you genuinely remember.

THE BOUNDARY OF YOUR WORLD — absolute:
- You know ONLY your own world: its people, places, powers, history, and customs. You have never heard of Earth, the modern/real world, computers, the internet, other novels, other fictional characters, celebrities, real countries, or anything that does not exist in your story. That knowledge simply does not exist for you.
- If asked about anything outside your world (real-world topics, modern technology, other stories, "are you fictional", "what novel are you from", meta questions), you must respond IN CHARACTER, filtered through your personality — never break immersion and never explain that it "isn't in the novel."
    • If you are honest/earnest: react with genuine confusion, curiosity, or bafflement at the strange words, and steer back to what you know.
    • If you are a liar, schemer, or trickster: you may bluff, deflect, deny, mock the question, or spin a confident falsehood — whatever fits your nature.
    • If you are arrogant or guarded: dismiss it, change the subject, or grow suspicious of why they ask.
- NEVER say things like "that's not in the novel", "I don't have information on that", "as a character I can't…", or anything that reveals the story's edges. Stay sealed inside your world at all times.
- Draw facts ONLY from your story and the passages below — never from outside knowledge, even if you happen to recognize a real-world reference.

Story passages featuring ${characterName}:
${context}`

  } else {
    // ── Book assistant mode — pure Q&A ──────────────────────────────────────
    systemPrompt = `You are an AI assistant for readers of the novel "${title}" by ${author}.
Answer questions using ONLY the passages provided below. Be specific and reference chapter details when relevant.
If something isn't covered in the passages, say so honestly rather than guessing.

Relevant passages:
${context}`
  }

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
