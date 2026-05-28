import { NextResponse } from 'next/server'

const VPS_BASE = process.env.VPS_API_URL
const VPS_KEY  = process.env.VPS_API_KEY

// ── In-process cache ──────────────────────────────────────────────────────────
// Novels change slowly (scraper adds a few per day). Cache for 10 minutes
// so a cache miss (VPS read) happens at most 6× per hour, not every 90s.
interface Cache { data: unknown[]; ts: number }
let cache: Cache | null = null
const CACHE_TTL_MS = 10 * 60_000 // 10 minutes

// Single-flight: all concurrent cache-miss requests piggyback on one VPS call
let _inflight: Promise<unknown[]> | null = null

export async function GET() {
  if (!VPS_BASE) {
    return NextResponse.json({ error: 'VPS_API_URL not configured' }, { status: 500 })
  }

  const now = Date.now()

  // ── Serve from warm cache (instant) ──────────────────────────────────────
  if (cache && now - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json(cache.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        'X-Cache': 'HIT',
      },
    })
  }

  // ── Piggyback on an in-flight request ────────────────────────────────────
  if (_inflight) {
    try {
      const novels = await _inflight
      return NextResponse.json(novels, {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60', 'X-Cache': 'HIT' },
      })
    } catch {
      if (cache) return NextResponse.json(cache.data, { headers: { 'X-Cache': 'STALE' } })
      return NextResponse.json({ error: 'Failed to fetch novels' }, { status: 502 })
    }
  }

  // ── Cache miss — fetch from VPS (now reads index file, ~4ms) ─────────────
  _inflight = fetch(`${VPS_BASE}/novels`, {
    headers: { 'X-Api-Key': VPS_KEY!, 'Content-Type': 'application/json' },
    // No Next.js fetch cache — we manage our own longer-lived cache above
    cache: 'no-store',
  }).then(async res => {
    if (!res.ok) throw new Error(`VPS ${res.status}`)
    const data = await res.json()
    const novels: unknown[] = Array.isArray(data) ? data : (data.novels ?? [])
    cache = { data: novels, ts: Date.now() }
    return novels
  }).finally(() => { _inflight = null })

  try {
    const novels = await _inflight
    return NextResponse.json(novels, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        'X-Cache': 'MISS',
      },
    })
  } catch {
    _inflight = null
    // Serve stale cache rather than error if we have anything
    if (cache) {
      return NextResponse.json(cache.data, {
        headers: { 'Cache-Control': 'public, s-maxage=60', 'X-Cache': 'STALE' },
      })
    }
    return NextResponse.json({ error: 'Failed to fetch novels' }, { status: 502 })
  }
}
