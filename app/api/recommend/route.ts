import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const openai   = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const VPS_BASE = process.env.VPS_API_URL
const VPS_KEY  = process.env.VPS_API_KEY
const TOKENS_COST = 10

// ── Module-level library cache ────────────────────────────────────────────────
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

// ── Description keyword extraction ────────────────────────────────────────────
// Words that appear in virtually every web novel description — not discriminating
const DESC_STOPWORDS = new Set([
  'that','with','have','this','from','they','will','been','more','when',
  'there','their','what','about','would','which','into','some','where',
  'also','want','like','just','very','than','time','life','find','face',
  'know','make','take','come','each','while','after','before','upon',
  'once','only','must','even','such','many','other','great','long','back',
  'still','being','need','every','over','most','under','through','those',
  'these','born','another','between','against','become','because','without',
  'years','days','story','book','novel','chapter','person','people','place',
  'thing','group','human','began','start','suddenly','finally','though',
  'however','although','despite','since','until','during','unless','ever',
  'never','again','always','often','later','then','here','next','able',
  'young','world','were','them','from','have','with','this','your','them',
  'name','himself','herself','himself','itself','himself','himself','into',
  'could','should','three','four','five','nine','eight','seven','them',
  'among','along','above','below','under','right','wrong','knew','knew',
  'hand','eyes','face','head','body','heart','mind','soul','blood','same',
  'different','small','large','high','able','around','found','called',
  'came','gone','went','took','gave','show','made','used','good','better',
  'true','real','hard','easy','sure','seem','seem','look','want','keep',
  'hold','stay','help','work','live','move','open','turn','play','walk',
  'talk','tell','give','left','grew','grow','hear','knew','read','keep',
  'said','told','asks','gets','puts','sees','lets','sent','read','less',
  'just','much','well','full','free','only','both','each','from','with',
])

function extractDescKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !DESC_STOPWORDS.has(w))
    .slice(0, 50)
}

// ── Multi-signal scoring for "based on novels I like" ────────────────────────
// Builds a taste profile: genre set + weighted keyword map from liked novels
function buildTasteProfile(likedNovels: Novel[]): {
  genres: Set<string>
  keywords: Map<string, number>
} {
  const genres   = new Set<string>()
  const keywords = new Map<string, number>()

  for (const novel of likedNovels) {
    novel.genres.forEach(g => genres.add(g.toLowerCase()))

    // Count each unique word once per novel (IDF-style weighting:
    // a word in 3 out of 3 liked novels gets weight 3 = very representative)
    const words = new Set(extractDescKeywords(novel.description))
    for (const word of words) {
      keywords.set(word, (keywords.get(word) ?? 0) + 1)
    }
  }
  return { genres, keywords }
}

// Scores a candidate using combined genre + description signal
function scoreCandidateMulti(
  candidate: Novel,
  genres: Set<string>,
  keywords: Map<string, number>,
): number {
  // ── Genre score (0–1) ────────────────────────────────────────────────────
  const genreMatches = candidate.genres.filter(g => genres.has(g.toLowerCase())).length
  // Need to match at least ~35% of the genre profile for a full genre score
  const genreScore   = genres.size > 0
    ? Math.min(genreMatches / Math.max(genres.size * 0.35, 1), 1)
    : 0

  // ── Description keyword score (0–1) ─────────────────────────────────────
  // Check candidate's genres + description for keyword matches
  const haystack  = new Set(extractDescKeywords(
    candidate.genres.join(' ') + ' ' + candidate.description,
  ))
  let descRaw     = 0
  let totalWeight = 0
  for (const [word, weight] of keywords) {
    totalWeight += weight
    if (haystack.has(word)) descRaw += weight
  }
  const descScore = totalWeight > 0 ? Math.min(descRaw / totalWeight, 1) : 0

  // Description signal carries more weight than the genre label
  return 0.35 * genreScore + 0.65 * descScore
}

// ── GPT query expansion for "describe what I want" mode ──────────────────────
// Turns a vague user query into specific, thematic search terms
async function expandQueryWithGPT(query: string): Promise<string[]> {
  try {
    const completion = await openai.chat.completions.create({
      model:           'gpt-4o-mini',
      temperature:     0,
      max_tokens:      150,
      response_format: { type: 'json_object' },
      messages: [{
        role:    'user',
        content: `You are a web novel search assistant. Extract 12–16 specific search terms from the reader's request below.

Include:
- Genre labels (xianxia, wuxia, litrpg, apocalyptic, etc.)
- Tone descriptors (dark, comedic, grim, philosophical, lighthearted)
- Story tropes (reincarnation, system, transmigration, revenge, harem, dungeon)
- MC archetypes (scheming, ruthless, overpowered, underdog, villain protagonist)
- Setting elements (cultivation, martial arts, magic, sci-fi, mecha, space)

Skip generic words like "story", "novel", "good", "interesting", "want", "read".
Return ONLY valid JSON: {"terms":["term1","term2",...]}

Request: "${query.slice(0, 400)}"`,
      }],
    })
    const parsed = JSON.parse(completion.choices[0].message.content ?? '{}')
    return Array.isArray(parsed.terms)
      ? parsed.terms
          .map((t: unknown) => String(t).toLowerCase().trim())
          .filter((t: string) => t.length > 2 && t.length < 40)
          .slice(0, 16)
      : []
  } catch {
    // Fallback: naive keyword extraction
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !DESC_STOPWORDS.has(w))
      .slice(0, 16)
  }
}

// Score a candidate novel against expanded query terms
// Longer / more specific terms get extra weight
function scoreByTerms(candidate: Novel, terms: string[]): number {
  const haystack = (
    candidate.genres.join(' ') + ' ' +
    candidate.description + ' ' +
    candidate.title
  ).toLowerCase()

  let score = 0
  for (const term of terms) {
    if (haystack.includes(term)) {
      // Specificity bonus: "reincarnation" (13 chars) beats "dark" (4 chars)
      score += Math.max(1, Math.log(term.length + 1) * 2)
    }
  }
  return score
}

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
  let body: { mode?: unknown; slugs?: unknown; query?: unknown; spoilerSafe?: unknown }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  const mode        = body.mode
  const spoilerSafe = body.spoilerSafe === true

  if (mode !== 'novels' && mode !== 'description') {
    return NextResponse.json({ error: 'mode must be "novels" or "description"' }, { status: 400 })
  }

  // ── Load library ──────────────────────────────────────────────────────────
  let library: Novel[]
  try { library = await getLibrary() }
  catch { return NextResponse.json({ error: 'Could not load novel library' }, { status: 502 }) }

  const bySlug = new Map(library.map(n => [n.slug, n]))

  let candidates:    Novel[]
  let promptContext: string

  if (mode === 'novels') {
    // ── Novel-to-novel mode: multi-signal scoring ───────────────────────────
    const slugs    = Array.isArray(body.slugs) ? (body.slugs as unknown[]).slice(0, 5) : []
    const selected = slugs
      .filter((s): s is string => typeof s === 'string')
      .map(s => bySlug.get(s))
      .filter((n): n is Novel => !!n)

    if (selected.length === 0) {
      return NextResponse.json({ error: 'Select at least one novel' }, { status: 400 })
    }

    const selectedSlugs = new Set(selected.map(n => n.slug))

    // Build taste profile: genre set + description keyword weights
    const { genres: targetGenres, keywords: descProfile } = buildTasteProfile(selected)

    // Score every non-selected novel with the combined signal
    const scored = library
      .filter(n => !selectedSlugs.has(n.slug))
      .map(n => ({
        novel: n,
        score: scoreCandidateMulti(n, targetGenres, descProfile),
      }))
      .sort((a, b) => b.score - a.score)

    candidates = scored.slice(0, 20).map(s => s.novel)

    const likedList = selected.map(n => `"${n.title}" (${n.genres.join(', ')})`).join('; ')
    promptContext = `The user enjoyed these novels: ${likedList}.
Recommend novels from the candidates list that share similar genres, themes, tone, and narrative style.`

  } else {
    // ── Description mode: GPT-expanded keyword scoring ──────────────────────
    const query = typeof body.query === 'string' ? body.query.trim().slice(0, 500) : ''
    if (!query) return NextResponse.json({ error: 'Provide a description' }, { status: 400 })

    // Expand the query into thematic search terms via GPT
    const terms = await expandQueryWithGPT(query)

    const scored = library
      .map(n => ({ novel: n, score: scoreByTerms(n, terms) }))
      .sort((a, b) => b.score - a.score)

    candidates = scored.slice(0, 20).map(s => s.novel)

    promptContext = `The user is looking for: "${query}"\nKey themes extracted: ${terms.slice(0, 10).join(', ')}.`
  }

  // ── Build candidate text for GPT ─────────────────────────────────────────
  const candidateText = candidates.map((n, i) =>
    `${i + 1}. [${n.slug}] "${n.title}" by ${n.author} | ${n.genres.join(', ')} | ${n.total_chapters} ch.\n   ${n.description.slice(0, 200).replace(/\s+/g, ' ')}`
  ).join('\n\n')

  // ── Spoiler-safe instruction ──────────────────────────────────────────────
  const spoilerInstruction = spoilerSafe
    ? `\nSPOILER RULE: Do NOT reveal major plot twists, character deaths, romantic outcomes, villain reveals, or ending events. Focus only on premise, tone, and protagonist type. If a candidate's description contains such spoilers, write the blurb around the setup instead.`
    : ''

  // ── GPT ranking + blurb generation ───────────────────────────────────────
  const systemPrompt = `You are a web novel recommendation engine for NovelCodex.
${promptContext}

From the numbered candidate list below, pick the 5 best matches. For each, write a 1–2 sentence personalised "why you'll love this" blurb that connects it specifically to what the user wants — mention a shared theme, trope, or narrative element by name.${spoilerInstruction}

Return ONLY valid JSON in this exact shape (no markdown, no extra text):
{"recommendations":[{"slug":"...","blurb":"..."},{"slug":"...","blurb":"..."},...]}

Candidates:
${candidateText}`

  let recommendations: { slug: string; blurb: string }[]
  try {
    const completion = await openai.chat.completions.create({
      model:           'gpt-4o-mini',
      temperature:     0.4,
      max_tokens:      700,
      messages:        [{ role: 'user', content: systemPrompt }],
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

  // ── Atomically deduct tokens (single-statement RPC; fallback pre-migration) ──
  let remaining = profile.tokens - TOKENS_COST
  try {
    const { data: newBal, error: rpcErr } = await sb.rpc('debit_tokens', { p_user: user.id, p_amount: TOKENS_COST })
    if (rpcErr) {
      await sb.from('profiles').update({ tokens: profile.tokens - TOKENS_COST }).eq('id', user.id).gte('tokens', TOKENS_COST)
    } else if (typeof newBal === 'number') {
      remaining = newBal
    }
  } catch { /* non-fatal */ }

  return NextResponse.json(
    { recommendations: enriched },
    { headers: { 'X-Tokens-Remaining': String(remaining) } },
  )
}
