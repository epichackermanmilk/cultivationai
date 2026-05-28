import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const openai   = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const VPS_BASE = process.env.VPS_API_URL
const VPS_KEY  = process.env.VPS_API_KEY
const TOKENS_COST = 10

// ── Module-level cache (same pattern as /api/novels) ─────────────────────────
interface Novel {
  slug: string; title: string; author: string
  total_chapters: number; genres: string[]; cover_url: string; description: string
}
interface LibCache { novels: Novel[]; ts: number }
let libCache: LibCache | null = null
const LIB_TTL = 10 * 60_000

async function getLibrary(): Promise<Novel[]> {
  if (libCache && Date.now() - libCache.ts < LIB_TTL) return libCache.novels
  const res = await fetch(`${VPS_BASE}/novels`, {
    headers: { 'X-Api-Key': VPS_KEY!, 'Content-Type': 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`VPS ${res.status}`)
  const data = await res.json()
  const novels: Novel[] = Array.isArray(data) ? data : (data.novels ?? [])
  libCache = { novels, ts: Date.now() }
  return novels
}

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ── Score a candidate novel against a set of target genres ───────────────────
function scoreByGenres(candidate: Novel, targetGenres: Set<string>): number {
  return candidate.genres.reduce((s, g) => s + (targetGenres.has(g.toLowerCase()) ? 1 : 0), 0)
}

// ── Score a candidate novel against a free-text query ────────────────────────
function scoreByQuery(candidate: Novel, keywords: string[]): number {
  const haystack = (candidate.genres.join(' ') + ' ' + candidate.description).toLowerCase()
  return keywords.reduce((s, kw) => s + (haystack.includes(kw) ? 1 : 0), 0)
}

// ── Extract rough keywords from a description query ───────────────────────────
function extractKeywords(query: string): string[] {
  return query.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOPWORDS.has(w))
    .slice(0, 20)
}
const STOPWORDS = new Set([
  'that', 'with', 'have', 'this', 'from', 'they', 'will', 'been', 'more',
  'when', 'there', 'their', 'what', 'about', 'would', 'which', 'into',
  'some', 'where', 'also', 'want', 'like', 'just', 'very', 'than',
])

// ── POST /api/recommend ───────────────────────────────────────────────────────
export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const token = cookieStore.get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Sign in to use recommendations' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Session expired — please sign in again' }, { status: 401 })

  // ── Token balance ─────────────────────────────────────────────────────────
  const { data: profile } = await sb.from('profiles').select('tokens').eq('id', user.id).single()
  if (!profile || profile.tokens < TOKENS_COST) {
    return NextResponse.json(
      { error: `Recommendations cost ${TOKENS_COST} tokens. Visit the shop to get more.`, code: 'INSUFFICIENT_TOKENS' },
      { status: 402 },
    )
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: { mode?: unknown; slugs?: unknown; query?: unknown }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  const mode = body.mode
  if (mode !== 'novels' && mode !== 'description') {
    return NextResponse.json({ error: 'mode must be "novels" or "description"' }, { status: 400 })
  }

  // ── Load library ──────────────────────────────────────────────────────────
  let library: Novel[]
  try { library = await getLibrary() }
  catch { return NextResponse.json({ error: 'Could not load novel library' }, { status: 502 }) }

  // Build a slug→novel lookup
  const bySlug = new Map(library.map(n => [n.slug, n]))

  let candidates: Novel[]
  let promptContext: string

  if (mode === 'novels') {
    // ── Novel-to-novel mode ─────────────────────────────────────────────────
    const slugs = Array.isArray(body.slugs) ? (body.slugs as unknown[]).slice(0, 5) : []
    const selected = slugs
      .filter((s): s is string => typeof s === 'string')
      .map(s => bySlug.get(s))
      .filter((n): n is Novel => !!n)

    if (selected.length === 0) {
      return NextResponse.json({ error: 'Select at least one novel' }, { status: 400 })
    }

    // Build target genre set from all selected novels
    const targetGenres = new Set(selected.flatMap(n => n.genres.map(g => g.toLowerCase())))
    const selectedSlugs = new Set(selected.map(n => n.slug))

    // Score every novel not in the selected set
    const scored = library
      .filter(n => !selectedSlugs.has(n.slug))
      .map(n => ({ novel: n, score: scoreByGenres(n, targetGenres) }))
      .sort((a, b) => b.score - a.score)

    candidates = scored.slice(0, 20).map(s => s.novel)

    const likedList = selected.map(n => `"${n.title}" (${n.genres.join(', ')})`).join('; ')
    promptContext = `The user enjoyed these novels: ${likedList}.
Recommend novels from the candidates list that share similar genres, themes, or feel.`

  } else {
    // ── Description mode ───────────────────────────────────────────────────
    const query = typeof body.query === 'string' ? body.query.trim().slice(0, 500) : ''
    if (!query) return NextResponse.json({ error: 'Provide a description' }, { status: 400 })

    const keywords = extractKeywords(query)

    const scored = library
      .map(n => ({ novel: n, score: scoreByQuery(n, keywords) }))
      .sort((a, b) => b.score - a.score)

    candidates = scored.slice(0, 20).map(s => s.novel)

    promptContext = `The user is looking for: "${query}"`
  }

  // ── Compact candidate list for GPT ────────────────────────────────────────
  const candidateText = candidates.map((n, i) =>
    `${i + 1}. [${n.slug}] "${n.title}" by ${n.author} | ${n.genres.join(', ')} | ${n.total_chapters} ch.\n   ${n.description.slice(0, 200).replace(/\s+/g, ' ')}`
  ).join('\n\n')

  // ── GPT ranking + blurb generation ───────────────────────────────────────
  const systemPrompt = `You are a web novel recommendation engine for NovelCodex.
${promptContext}

From the numbered candidate list below, pick the 5 best matches. For each write a 1–2 sentence personalised "why you'll love this" blurb that connects it to what the user wants.

Return ONLY valid JSON in this exact shape (no markdown, no extra text):
{"recommendations":[{"slug":"...","blurb":"..."},{"slug":"...","blurb":"..."},...]}

Candidates:
${candidateText}`

  let recommendations: { slug: string; blurb: string }[]
  try {
    const completion = await openai.chat.completions.create({
      model:       'gpt-4o-mini',
      temperature: 0.4,
      max_tokens:  600,
      messages:    [{ role: 'user', content: systemPrompt }],
      response_format: { type: 'json_object' },
    })
    const parsed = JSON.parse(completion.choices[0].message.content ?? '{}')
    recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 5) : []
  } catch {
    return NextResponse.json({ error: 'Recommendation engine unavailable — please try again' }, { status: 502 })
  }

  // ── Enrich with full novel metadata ──────────────────────────────────────
  const enriched = recommendations
    .map(r => {
      const novel = bySlug.get(r.slug)
      if (!novel) return null
      return {
        slug:           novel.slug,
        title:          novel.title,
        author:         novel.author,
        total_chapters: novel.total_chapters,
        genres:         novel.genres,
        cover_url:      novel.cover_url,
        description:    novel.description.slice(0, 300),
        blurb:          r.blurb,
      }
    })
    .filter(Boolean)

  // ── Atomically deduct tokens ──────────────────────────────────────────────
  try {
    await sb
      .from('profiles')
      .update({ tokens: profile.tokens - TOKENS_COST })
      .eq('id', user.id)
      .gte('tokens', TOKENS_COST)
  } catch { /* non-fatal */ }

  return NextResponse.json(
    { recommendations: enriched },
    { headers: { 'X-Tokens-Remaining': String(profile.tokens - TOKENS_COST) } },
  )
}
