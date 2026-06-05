// POST /api/chat/multi — multi-novel chat.
// RAG-retrieves passages from EACH selected novel and answers questions that
// span all of them at once. Streams the answer; charges 15 tokens on success.

import OpenAI            from 'openai'
import { matchChunks, isNovelEmbedded } from '@/lib/supabase'
import { triggerEmbed }  from '@/lib/vps'
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
const MAX_NOVELS = 10
const CHUNKS_PER_NOVEL = 6

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

  // Pull each novel's synopsis up front. The synopsis names the protagonist and
  // grounds the model on WHO each novel's main character is — without it, broad
  // questions like "which MC is stronger" retrieve generic combat passages and
  // the model can't tell who the lead even is (and may grab the wrong character).
  const slugs = novels.map(n => n.slug)
  const { data: metaRows } = await sb
    .from('novels')
    .select('slug, title, author, description')
    .in('slug', slugs)
  const metaBySlug = new Map((metaRows ?? []).map(r => [r.slug as string, r]))

  // For each novel: if it's indexed, retrieve passages; if not, silently start
  // indexing it (kick off the embed in the background) so it's ready next time.
  const stillIndexing: string[] = []
  const perNovel = await Promise.all(novels.map(async n => {
    const meta = metaBySlug.get(n.slug)
    const title = (meta?.title as string) || n.title || n.slug
    const description = (meta?.description as string) || ''
    try {
      const embedded = await isNovelEmbedded(n.slug)
      if (!embedded) {
        triggerEmbed(n.slug).catch(() => {})   // fire-and-forget auto-index
        stillIndexing.push(title)
        return { title, description, chunks: [], embedded: false }
      }
      // An embedded novel is ALWAYS kept (so it's never silently dropped from the
      // comparison). If the vector search itself errors/times out, we still
      // include it with its synopsis. Retry once with cheaper params on failure.
      let chunks: Awaited<ReturnType<typeof matchChunks>> = []
      try { chunks = await matchChunks(queryEmbedding, n.slug, CHUNKS_PER_NOVEL, 0.1) }
      catch { try { chunks = await matchChunks(queryEmbedding, n.slug, 4, 0.25) } catch { /* synopsis-only */ } }
      return { title, description, chunks, embedded: true }
    } catch {
      // Only an isNovelEmbedded failure lands here — treat as not-ready.
      return { title, description, chunks: [], embedded: false }
    }
  }))

  // Every embedded novel is included — even if chunk retrieval was thin — so a
  // selected novel is NEVER silently dropped from the comparison. Its synopsis
  // still anchors the model on that novel's protagonist.
  const ready = perNovel.filter(p => p.embedded)

  // Nothing ready yet — we just kicked off indexing. Don't charge; signal the
  // client to poll status and answer automatically when indexing finishes.
  if (ready.length === 0) {
    const names = stillIndexing.length ? stillIndexing.join(', ') : 'the selected novels'
    const msg = `I'm reading ${names} for you now — large novels can take a few minutes the first time. ` +
                `You can stay here and I'll answer automatically the moment they're ready, or leave and come back and ask again anytime — the indexing keeps going either way.`
    return new Response(msg, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-NC-Indexing': slugs.join(','),
      },
    })
  }

  // Build a clearly-labelled, per-novel context block: synopsis first (names the
  // protagonist), then the retrieved passages.
  const context = ready.map(p => {
    const syn = p.description ? `Synopsis: ${p.description}\n\n` : ''
    const passages = p.chunks.length
      ? p.chunks.map(c => `[Ch.${c.chapter_number}${c.chapter_title ? ` — ${c.chapter_title}` : ''}] ${c.text}`).join('\n\n')
      : '(No specific passages matched this question — rely on the synopsis above and say if detail is limited.)'
    return `## ${p.title}\n${syn}${passages}`
  }).join('\n\n———\n\n')

  const novelList = ready.map(p => `"${p.title}"`).join(', ')
  const indexingNote = stillIndexing.length
    ? `\nNote: ${stillIndexing.join(', ')} ${stillIndexing.length === 1 ? 'is' : 'are'} still being indexed and not yet available — if the question needs ${stillIndexing.length === 1 ? 'it' : 'them'}, briefly mention they'll be ready in a few minutes.\n`
    : ''

  const systemPrompt = `You are NovelCodex, an AI assistant that answers questions spanning MULTIPLE web novels at once.
The reader has selected these novels: ${novelList}.
${indexingNote}
CRITICAL rules:
- You MUST address EVERY novel the reader selected. If the question compares the novels (e.g. "which main character is stronger"), you must discuss the protagonist/relevant characters from EACH novel — never answer about only one, and never substitute a character from a different novel.
- Each novel's "Synopsis" names and frames that novel's protagonist — use it to correctly identify who the main character is. Do NOT confuse characters across novels.
- Draw facts from the passages provided. The synopsis is reliable for who-is-who and the premise; the passages are reliable for specific events and details.
- If a novel's passages are thin for this question, work from its synopsis and say plainly what's uncertain — do NOT invent, and do NOT pad the answer with another novel's characters.
- Make comparisons explicit and always attribute each fact to the specific novel it comes from.
- Be COMPLETELY OBJECTIVE. When comparing power/strength, judge strictly by actual feats and power scaling — NEVER force a "tie" or false balance for fairness. If one character vastly out-scales the other, say so plainly (a stomp is a stomp). No moralizing, no sanitizing, no AI opinion — pure lore facts.

Be specific and cite chapter details when useful.

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
