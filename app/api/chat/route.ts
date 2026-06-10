import OpenAI from 'openai'
import { matchChunks, getChapterSummaries } from '@/lib/supabase'
import { scrollTitles, scrollRange, scrollChrono, keywordSearch as qdrantKeyword } from '@/lib/qdrant'
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

// "second death game", "the final trial", "the 3rd tournament", "next arc"…
const EPISODIC_RE = /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|final|last|next|latest|previous|\d{1,3}(?:st|nd|rd|th))\s+(death\s+game|game|arc|trial|round|tournament|war|battle|raid|dungeon|mission|quest|volume|part|saga|tribulation|test|exam|phase|stage|world|floor|layer|realm|match|invasion|expedition|event|instance|scenario)\b/i

type ArcRow = { text: string; chapter_number: number; chapter_title: string; similarity: number }

// Episodic "arc locator": the reader asks about a specific arc/episode the novel
// never explicitly numbers. The chapter TITLES reveal the structure, so we let a
// cheap model read the title spine, identify the chapter range, and pull it.
// Pull the ordinal out of an episodic question: "the fifth arc" → 5,
// "the 3rd tournament" → 3, "the final/last trial" → 'last'. Returns null for
// non-positional phrasings ("next"/"previous") we can't resolve without context.
function parseEpisodicOrdinal(message: string): number | 'last' | null {
  const m = message.toLowerCase()
  if (/\b(final|last|latest)\s+\w+/.test(m)) return 'last'
  const WORDS: Record<string, number> = {
    first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
    sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  }
  for (const [w, n] of Object.entries(WORDS)) {
    if (new RegExp(`\\b${w}\\s+\\w+`).test(m)) return n
  }
  const d = m.match(/\b(\d{1,3})(?:st|nd|rd|th)\s+\w+/)
  if (d) return parseInt(d[1], 10)
  return null
}

// Episodic "arc locator": the reader asks about the Nth arc/event the novel never
// explicitly numbers. The model ENUMERATES every occurrence of that section type
// in reading order; the CODE then selects the Nth. This is the key correctness
// property — the model can't shortcut an ordinal like "fifth" into "chapter 5"
// (the previous bug), because it never picks the index, it only segments.
async function locateArcRange(
  slug: string,
  title: string,
  message: string,
): Promise<ArcRow[] | null> {
  try {
    const ordinal = parseEpisodicOrdinal(message)
    if (ordinal === null) return null

    // One row per chapter (chunk_index=0) in reading order, from Qdrant.
    const titles = await scrollTitles(slug)
    if (titles.length < 4) return null
    const lastCh = titles[titles.length - 1].chapter_number
    const titleList = titles.map(t => `${t.chapter_number}. ${t.chapter_title}`).join('\n')

    const r = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1200,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `You segment the web novel "${title}" into its major sections using its ordered chapter list, then list them so a caller can pick one.

The reader asked: "${message}"

1. Decide what KIND of recurring section they mean — a story "arc"/"saga"/"volume"/"part", or a specific recurring event ("death game", "tournament", "trial", "war", etc.).
2. Scan the chapter titles from chapter 1 onward and identify EVERY occurrence of that kind, in chronological order. A section STARTS when a new major goal / setting / opponent / event begins and ENDS at the chapter just before the next one begins.

Return JSON: {"found": boolean, "kind": string, "occurrences": [{"start": number, "end": number, "label": "short name"}, ...]}.

Hard rules:
- List ALL occurrences in order — do NOT try to pick the one the reader wants, the caller does that.
- NEVER map the reader's ordinal (e.g. "fifth") to a chapter number. "The fifth arc" means the 5th item in your list, which in a long novel usually starts well past chapter 100 — not chapter 5.
- The first arc/section usually starts at or near chapter 1. Most arcs span 15-60+ chapters.
- Cover the ENTIRE novel: keep listing arcs all the way through chapter ${lastCh}. The last arc you list should end at or near chapter ${lastCh}.
- Use only chapter numbers that exist (1..${lastCh}). starts must strictly increase.
- found=false only if the story genuinely has no such sections.

Chapters:
${titleList}` },
        { role: 'user', content: 'List every occurrence in order as specified.' },
      ],
    })
    const j = JSON.parse(r.choices[0]?.message?.content ?? '{}')
    const occ: { start: number; end: number; label?: string }[] =
      Array.isArray(j.occurrences)
        ? j.occurrences.filter((o: { start?: unknown }) => typeof o?.start === 'number')
        : []
    if (!j.found || !occ.length) {
      console.error('[arc]', JSON.stringify({ q: message, ord: ordinal, titles: titles.length, kind: j.kind, n: occ.length, hit: false }))
      return null
    }

    // Select the requested occurrence IN CODE.
    const idx = ordinal === 'last' ? occ.length - 1 : ordinal - 1
    if (idx < 0 || idx >= occ.length) {
      console.error('[arc]', JSON.stringify({ q: message, ord: ordinal, n: occ.length, hit: false, reason: 'out-of-range' }))
      return null   // they asked for the 8th of 5 — don't guess
    }
    const sel = occ[idx]
    let start = Math.max(1, Math.floor(sel.start))
    let end = Math.floor(
      typeof sel.end === 'number' && sel.end >= start
        ? sel.end
        : (occ[idx + 1]?.start ? occ[idx + 1].start - 1 : start + 30),
    )
    if (end < start + 12) end = start + 12
    end = Math.min(end, start + 80, lastCh)   // bound retrieval span

    // The final arc concludes the story, so it must reach the end of the novel.
    // On very long title lists the model often under-enumerates and stops well
    // short — anchor "last/final" to the tail instead of trusting that endpoint.
    if (ordinal === 'last' && end < lastCh - 30) {
      start = Math.max(1, lastCh - 70)
      end   = lastCh
    }
    console.error('[arc]', JSON.stringify({ q: message, ord: ordinal, n: occ.length, idx, start, end, label: sel.label, hit: true }))

    const rows = await scrollRange(slug, start, end, 200)
    if (!rows.length) return null
    // Sample evenly across the arc so a long arc's ending isn't dropped.
    let picked = rows
    if (rows.length > 40) {
      const step = rows.length / 40
      picked = Array.from({ length: 40 }, (_, i) => rows[Math.floor(i * step)])
    }
    return picked.map(r => ({ text: r.text, chapter_number: r.chapter_number, chapter_title: r.chapter_title, similarity: 1 }))
  } catch (e) {
    console.error('[arc] error:', String(e))
    return null
  }
}

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
  // Prefix-matched (no trailing \b) so "summarize"/"summary"/"synopsis" match —
  // the old trailing \b made "summar" require being a whole word and never fired.
  const BROAD_RE = /\b(summar|recap|overview|tl;?dr|first arc|early chapter|beginning|opening|so far|what happens|what'?s? (it|this) about|main plot|story so far|synops|whole (story|book|novel|thing)|entire (story|book|novel)|key events|main events|main characters|premise)/i
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

  // ── Retrieval: vector (HyDE) + keyword, fused by reciprocal-rank fusion ──────
  // Each retrieval is wrapped so a vector-search timeout (large novels) degrades
  // gracefully instead of crashing the request.
  const PER = characterName ? 8 : 14
  const TH  = 0.1
  type Row = { text: string; chapter_number: number; chapter_title: string; similarity: number }
  const safeMatch = async (emb: number[], th: number) => {
    try { return await matchChunks(emb, slug, PER, th) }
    catch { try { return await matchChunks(emb, slug, 6, 0.25) } catch { return [] } }
  }
  // Vector (+HyDE) first so we can gauge confidence before adding keyword.
  const vecLists: Row[][] = await Promise.all([
    safeMatch(queryEmbedding, TH),
    ...(hydeEmbedding ? [safeMatch(hydeEmbedding, TH)] : []),
  ])
  // W9/adaptive-hybrid: best vector cosine (keyword/chrono carry 0/1 sentinels).
  const topSim = Math.max(0, ...vecLists.flat().map(r => r.similarity).filter(s => s > 0 && s < 0.999))
  // Keyword/full-text leg ONLY when vector confidence is low — on confident
  // matches it just adds tangential name-matches that dilute the answer (the eval
  // measured this regressing well-covered questions). Book mode only.
  const kwList: Row[] = (!characterName && topSim < 0.42) ? await qdrantKeyword(slug, message, 12) : []
  const lists: Row[][] = [...vecLists, kwList]

  // Reciprocal-rank fusion: a chunk ranked highly by more than one retriever wins.
  const RRF_K = 60
  const fused = new Map<string, { row: Row; score: number }>()
  for (const list of lists) {
    list.forEach((c, i) => {
      const k = `${c.chapter_number}:${c.text.slice(0, 48)}`
      const add = 1 / (RRF_K + i)
      const cur = fused.get(k)
      if (cur) cur.score += add
      else fused.set(k, { row: c, score: add })
    })
  }
  let chunks: Row[] = [...fused.values()].sort((a, b) => b.score - a.score).map(s => s.row).slice(0, isBroad ? 14 : 22)

  // ── Episodic "arc locator" ──────────────────────────────────────────────────
  // "The second death game / the X arc / the final trial" — pinpoint the chapter
  // range from the title spine and pull those chapters in order.
  let isArc = false
  if (!characterName && EPISODIC_RE.test(message)) {
    const arc = await locateArcRange(slug, title, message)
    if (arc && arc.length) { chunks = arc; isArc = true }
  }

  // ── L2 summary layer: ordered / early-story / timeline / progression ────────
  // Raw chunk retrieval fails on questions that need the early arc IN ORDER (it
  // pulls scattered or late-story passages). The chapter summaries are a clean
  // chronological index — use them for these question shapes when available.
  // Trigger ONLY for ordered-COVERAGE questions (trace / list / timeline /
  // progression / allies-enemies / in order) — NOT narrative "summarize", which
  // the full-text chunk spine answers better than terse summaries (measured).
  let isSummary = false
  const ORDERED_RE = /\b(trace|list|every|all (the|her|his|major|of)|in order|chronolog|timeline|sequence of|progression|step[- ]by[- ]step|history of|allies|enemies|adversaries|grow stronger|major events|over the (early|course)|between .+ and)\b/i
  if (!characterName && !isArc && ORDERED_RE.test(message)) {
    let to = 120
    const mN = message.match(/first\s+(\d{1,4})/i)
    if (mN) to = Math.min(parseInt(mN[1], 10) + 8, 200)
    else if (/\bfirst\s+\w+\s+chapters?\b|\b(early|opening|beginning|initial|start)\b/i.test(message)) to = 80
    const sums = await getChapterSummaries(slug, 1, to, 130)
    if (sums.length >= 8) {
      chunks = sums.map(s => ({
        text: `[Ch.${s.chapter_number}${s.chapter_title ? ` — ${s.chapter_title}` : ''}] ${s.summary}`,
        chapter_number: s.chapter_number, chapter_title: s.chapter_title, similarity: 0,
      }))
      isSummary = true
    }
  }

  if (isBroad && !isArc && !isSummary) {
    // Broad summary/overview: weave in a chronological spine of the story.
    try {
      const chrono = await scrollChrono(slug, wantsEarly ? 18 : 60)
      if (chrono.length) {
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
  }

  // Present ordered material (summaries / arcs) in reading order so it flows.
  if (isBroad || isArc || isSummary) chunks.sort((a, b) => a.chapter_number - b.chapter_number)

  if (chunks.length === 0) {
    const notFoundMsg = characterName
      ? `*${characterName} looks around, puzzled.* I'm afraid I can't recall anything about that — try asking me something else.`
      : "I don't have enough information from this novel to answer that question. Try asking about specific characters, events, or plot points."
    return new Response(notFoundMsg, { headers: { 'Content-Type': 'text/plain' } })
  }

  // W1: previously every retrieved chunk was truncated to 900 chars (~150 of its
  // ~500 words), discarding most of what retrieval found. Show chunks fully; for
  // precise questions keep fewer-but-complete chunks (focus > breadth).
  const CTX_N   = (isBroad || isArc || isSummary) ? chunks.length : Math.min(chunks.length, 12)
  const CTX_CAP = (isBroad || isArc || isSummary) ? 1400 : 2600
  const context = chunks
    .slice(0, CTX_N)
    .map(c => `[Ch.${c.chapter_number} — ${c.chapter_title}]\n${c.text.slice(0, CTX_CAP)}`)
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
    const broadNote = isSummary
      ? `\nThe items below are CONCISE PER-CHAPTER SUMMARIES of the novel in reading order (each tagged with its chapter number). They form a faithful chronological index. Use them to answer in order — trace the progression, list events/relationships/breakthroughs chronologically, and ground claims in the chapter numbers shown. Synthesize a complete, well-ordered answer; you have the whole relevant span here, so be thorough rather than vague.\n`
      : isArc
      ? `\nThe passages below are the chapters that make up the specific section/arc the reader asked about, in reading order. Walk through what happens across them and synthesize a clear, coherent answer that follows the events in sequence. You don't need a passage for every sentence — convey the throughline of this section. If a detail genuinely isn't in these chapters, say so briefly rather than inventing.\n`
      : isBroad
      ? `\nThe reader is asking for a summary/overview. The passages below are drawn in READING ORDER from the relevant part of the story. Synthesize across them into a flowing, coherent summary — connect events chronologically rather than answering with isolated facts. It's fine to generalize the throughline of the arc; you do not need a passage for every sentence. Aim for a few tight paragraphs.\n`
      : ''
    // W9: when the best semantic match is weak, the passages likely don't cover
    // the question — instruct stricter grounding / explicit abstention.
    const lowConf = !isArc && !isBroad && !isSummary && topSim < 0.28
    const confidenceNote = lowConf
      ? `\nIMPORTANT — retrieval confidence is LOW for this question: the passages may not actually cover what was asked. Answer ONLY what is clearly and directly supported by them. If they do not genuinely address the question, say so plainly ("I don't find that in this novel") instead of guessing or stretching.\n`
      : ''
    systemPrompt = `You are an AI assistant for readers of the novel "${title}" by ${author}.
Answer using the passages provided below. They were retrieved by relevance and may be out of order or partial — piece the answer together from whatever relevant details genuinely appear across them, and cite chapter numbers when useful.

GROUNDING RULES — do not break these:
- Every name, technique, event, place, or fact in your answer MUST appear in the passages below. NEVER invent or guess names/techniques/events, and never fill gaps with plausible-sounding inventions.
- If the question assumes something that the passages do NOT support (a false premise — e.g. a technique or event that isn't there), do not play along. Say you don't find evidence of that specific thing in what you have, and share the closest thing the passages DO show, if any.
- It's better to say "the passages don't cover that" than to fabricate. Only answer confidently for things actually present in the passages.
- You may connect and infer across passages, but inferences must be clearly grounded in what's written — not invented.
- Be COMPLETELY OBJECTIVE: report what the novel actually depicts — including dark, violent, ruthless, or morally grey content — with no moralizing, no sanitizing, and no personal or AI opinion coloring the facts. Pure, neutral lore.
${confidenceNote}${broadNote}
Relevant passages:
${context}`
  }

  const stream = await openai.chat.completions.create({
    model:          'gpt-4o-mini',
    stream:         true,
    stream_options: { include_usage: true },
    max_tokens:     (isBroad || isArc || isSummary) ? 1100 : 800,
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

  const dbgNums = chunks.map(c => c.chapter_number)
  return new Response(readable, {
    headers: {
      'Content-Type':       'text/plain; charset=utf-8',
      'X-Tokens-Remaining': String(profile.tokens - CHAT_COST),
      'X-NC-Mode':          isSummary ? 'summary' : isArc ? 'arc' : isBroad ? 'broad' : 'fused',
      'X-NC-Chapters':      dbgNums.length ? `${Math.min(...dbgNums)}-${Math.max(...dbgNums)} n=${chunks.length}` : 'none',
    },
  })
}
