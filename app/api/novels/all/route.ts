import { NextResponse } from 'next/server'
import { cleanGenres } from '@/lib/genres'
import { FEATURED_SLUG_SET, COMING_SOON_NOVELS } from '@/lib/featured-novels'

// GET /api/novels/all
// Full catalogue for the library "scale" view: the 8 featured novels are live
// (clickable), every other scraped novel is returned with locked: true so the UI
// can show the catalogue behind a non-clickable "coming soon" barrier.
const VPS_BASE = process.env.VPS_API_URL
const VPS_KEY  = process.env.VPS_API_KEY

interface Cache { data: unknown[]; ts: number }
let cache: Cache | null = null
const CACHE_TTL_MS = 10 * 60_000
let _inflight: Promise<unknown[]> | null = null

export async function GET() {
  if (!VPS_BASE) return NextResponse.json({ error: 'VPS_API_URL not configured' }, { status: 500 })

  const now = Date.now()
  if (cache && now - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json(cache.data, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60', 'X-Cache': 'HIT' } })
  }
  if (_inflight) {
    try { return NextResponse.json(await _inflight, { headers: { 'X-Cache': 'HIT' } }) }
    catch { if (cache) return NextResponse.json(cache.data, { headers: { 'X-Cache': 'STALE' } }); return NextResponse.json({ error: 'Failed to fetch novels' }, { status: 502 }) }
  }

  _inflight = fetch(`${VPS_BASE}/novels`, {
    headers: { 'X-Api-Key': VPS_KEY!, 'Content-Type': 'application/json' },
    cache: 'no-store',
  }).then(async res => {
    if (!res.ok) throw new Error(`VPS ${res.status}`)
    const data = await res.json()
    const raw: unknown[] = Array.isArray(data) ? data : (data.novels ?? [])
    const all = raw.map(n => {
      const nn = n as { slug?: string; title?: string; author?: string; total_chapters?: number; genres?: string[]; cover_url?: string }
      const featured = !!nn.slug && FEATURED_SLUG_SET.has(nn.slug)
      return {
        slug:           nn.slug,
        title:          nn.title,
        author:         nn.author,
        total_chapters: nn.total_chapters,
        genres:         cleanGenres(nn.genres),
        cover_url:      nn.cover_url,
        // Featured = live & clickable; everything else = locked behind the preview wall
        ...(featured ? {} : { locked: true }),
      }
    }).filter(n => n.slug)

    // Any featured novel not yet present in the index → show as coming-soon (live target)
    const present = new Set(all.map(n => n.slug))
    for (const cs of COMING_SOON_NOVELS) {
      if (!present.has(cs.slug)) all.push({ ...cs })
    }

    cache = { data: all, ts: Date.now() }
    return all
  }).finally(() => { _inflight = null })

  try {
    return NextResponse.json(await _inflight, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60', 'X-Cache': 'MISS' } })
  } catch {
    _inflight = null
    if (cache) return NextResponse.json(cache.data, { headers: { 'X-Cache': 'STALE' } })
    return NextResponse.json({ error: 'Failed to fetch novels' }, { status: 502 })
  }
}
