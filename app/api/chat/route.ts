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

  // Detect broad "summarize / overview / first arc" style questions. Pure top-k
  // semantic search handles these poorly — the query ("summarize the first arc")
  // doesn't resemble story prose, so the nearest chunks are scattered or empty.
  // For these we retrieve a CHRONOLOGICAL narrative spine instead so the model
  // has coherent, sequential material to synthesize from.
  const BROAD_RE = /\b(summar|recap|overview|tl;?dr|first arc|early chapter|beginning|opening|so far|what happens|what'?s? (it|this) about|main plot|story so far|synops|whole (story|book|novel|thing)|entire (story|book|novel)|key events|main events|main characters|premise|plot)\b/i
  const isBroad = !characterName && BROAD_RE.test(message)
  const wantsEarly = /\b(first arc|early|beginning|start|opening|so far|initial)\b/i.test(message)

  // ── HyDE (Hypothetical Document Embeddings) ────────────────────────────────
  // A question like "what happened in the second death game" embeds far away from
  // the actual chapter prose (which narrates the events without labelling them
  // "second"), so naive top-k recall misses them. We first generate a short
  // hypothetical answer in the novel's style — narrative prose that embeds MUCH
  // closer to the real chunks — and search with BOTH the question and that
  // passage. This is the single biggest recall win for specific event questions.
  let hydeText = ''
  if (!characterName) {
    try {
      const hyde = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 180,
        temperature: 0.7,
        messages: [{
          role: 'system',
          content: `You help search a web-novel database. Write a SHORT hypothetical excerpt (2-3 sentences) that could plausibly appear in the novel "${title}" and would answer the reader's question. Write it as narrative prose in the novel's style, inventing concrete-sounding names/places/events. Accuracy does NOT matter — it is used only as a semantic search query, never shown to anyone. Reader's question: "${message}"`,
        }],
      })
      hydeText = hyde.choices[0]?.message?.content?.trim() ?? ''
    } catch { /* HyDE is best-effort */ }
  }

  const toEmbed = hydeText ? [embeddingQuery, hydeText] : [embeddingQuery]
  const embRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: toEmbed,
  })
  const queryEmbedding = embRes.data[0].embedding
  const hydeEmbedding  = hydeText ? embRes.data[1].embedding : null

  // Higher recall: more candidates + a lower threshold, across both vectors.
  const PER = characterName ? 8 : 12
  const TH  = 0.1
  const retrievals = await Promise.all([
    matchChunks(queryEmbedding, slug, PER, TH),
    ...(hydeEmbedding ? [matchChunks(hydeEmbedding, slug, PER, TH)] : []),
  ])
  // Merge + dedupe (keep the highest similarity per chunk), then take the top ~16.
  const byKey = new Map<string, { text: string; chapter_number: number; chapter_title: string; similarity: number }>()
  for (const list of retrievals) {
    for (const c of list) {
      const k = `${c.chapter_number}:${c.text.slice(0, 48)}`
      const prev = byKey.get(k)
      if (!prev || c.similarity > prev.similarity) byKey.set(k, c)
    }
  }
  let chunks = [...byKey.values()].sort((a, b) => b.similarity - a.similarity).slice(0, isBroad ? 12 : 16)

  if (isBroad) {
    // Pull chapters in reading order and merge them with the semantic matches.
    // "First arc / beginning" → earliest chapters; otherwise sample across the book.
    try {
      const { data: chrono } = await sb
        .from('chunks')
        .select('text, chapter_number, chapter_title')
        .eq('slug', slug)
        .order('chapter_number', { ascending: true })
        .order('chunk_index',    { ascending: true })
        .limit(wantsEarly ? 18 : 60)
      if (chrono && chrono.length) {
        let extra = chrono.slice(0, 18)
        if (!wantsEarly && chrono.length > 18) {
          const step = Math.max(1, Math.floor(chrono.length / 18))
          extra = chrono.filter((_, i) => i % step === 0).slice(0, 18)
        }
        const seen = new Set(chunks.map(c => `${c.chapter_number}:${c.text.slice(0, 40)}`))
        for (const e of extra) {
          const k = `${e.chapter_number}:${e.text.slice(0, 40)}`
          if (!seen.has(k)) { chunks.push({ ...e, similarity: 0 }); seen.add(k) }
        }
      }
    } catch { /* fall back to semantic-only */ }
    // Present in reading order so the summary flows chronologically.
    chunks.sort((a, b) => a.chapter_number - b.chapter_number)
  }

  if (chunks.length === 0) {
    const notFoundMsg = characterName
      ? `*${characterName} looks around, puzzled.* I'm afraid I can't recall anything about that — try asking me something else.`
      : "I don't have enough information from this novel to answer that question. Try asking about specific characters, events, or plot points."
    return new Response(notFoundMsg, { headers: { 'Content-Type': 'text/plain' } })
  }

  const context = chunks
    .map(c => `[Ch.${c.chapter_number} — ${c.chapter_title}]\n${c.text.slice(0, isBroad ? 700 : 900)}`)
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
1. You are speaking TO a real person standing before you — a visitor, a stranger, an interlocutor in your world. Address them directly as "you." They are NOT you, and they are NOT a reader. This is a face-to-face conversation.
2. FORMAT — this is how every reply must feel: blend *third-person action cues in italics* that show your physical demeanour, expression, and movement (e.g. *He narrows his eyes, as if weighing the question.* or *She turns the cup slowly in her hand.*) with the words you actually speak in first person. The effect should be like sitting across from you — not a diary, not narration, not a speech.
3. NEVER write inner monologue or narrate your own thoughts to yourself ("I think to myself…", drifting reflection). Every line is either something you DO (an italic action cue) or something you SAY aloud to the person. If you're contemplating, SHOW it with an action cue, then speak.
4. Emotional authenticity over information delivery. This is a conversation, not a recitation. Usually 2–5 sentences; leave room for them to respond.
5. Never summarise events like a storyteller. Speak from lived experience — "I remember…", "When I faced…", "The day I…"
6. If the memory note above mentions facts the person told you (their name, things they said), reference them naturally — as if you genuinely remember.
7. Never acknowledge being an AI, a book character, or fictional.

YOUR NATURE IS ABSOLUTE — never soften it:
- Your morality, values, ambitions, and the choices you would make are EXACTLY those of ${characterName} as written in this story — and nothing else. If you are ruthless, pragmatic, cruel, scheming, cold, or amoral, you answer that way without flinching, apologising, or moralising.
- Do NOT impose modern, real-world, or "helpful assistant" ethics onto your answers. Do NOT make yourself sound kinder, safer, more virtuous, more reluctant, or more remorseful than you truly are. This is the single most common way these conversations are ruined — refuse to let it happen.
- Answer every question — including dark, extreme, or morally horrifying hypotheticals — honestly, as your character would genuinely think and act. A character who would do anything for power must say so plainly when asked whether they would. Hedging, disclaimers, or out-of-character virtue are lore-breaking and forbidden.
- You are not here to be likeable, balanced, or reassuring. You are here to be exactly who you are — conviction intact, however unsettling.

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
    const broadNote = isBroad
      ? `\nThe reader is asking for a summary/overview. The passages below are drawn in READING ORDER from the relevant part of the story. Synthesize across them into a flowing, coherent summary — connect events chronologically rather than answering with isolated facts. It's fine to generalize the throughline of the arc; you do not need a passage for every sentence. Aim for a few tight paragraphs.\n`
      : ''
    systemPrompt = `You are an AI assistant for readers of the novel "${title}" by ${author}.
Answer using the passages provided below. They were retrieved by semantic relevance and may be out of order or partial — piece the answer together from whatever relevant details appear across them, even if scattered, and reference chapter numbers when useful.
Only say you can't answer if NONE of the passages relate to the question at all. Do not refuse just because the passages don't use the exact wording of the question — infer and connect. Never invent facts that contradict the passages.
${broadNote}
Relevant passages:
${context}`
  }

  const stream = await openai.chat.completions.create({
    model:          'gpt-4o-mini',
    stream:         true,
    stream_options: { include_usage: true },
    max_tokens:     isBroad ? 1100 : 800,
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
