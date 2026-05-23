import { NextResponse } from 'next/server'

const VPS_BASE = process.env.VPS_API_URL
const VPS_KEY  = process.env.VPS_API_KEY

// ── In-process cache — avoids hitting VPS on every page load ──────────────────
interface Cache { data: unknown[]; ts: number }
let cache: Cache | null = null
const CACHE_TTL_MS = 90_000 // 90 seconds

// Single-flight: prevent thundering-herd when cache is cold.
// Multiple concurrent requests all wait on the same VPS fetch.
let _inflight: Promise<unknown[]> | null = null

export async function GET() {
  if (!VPS_BASE) {
    return NextResponse.json({ error: 'VPS_API_URL not configured' }, { status: 500 })
  }

  // Serve from cache if fresh
  const now = Date.now()
  if (cache && now - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json(cache.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        'X-Cache': 'HIT',
      },
    })
  }

  // If another request is already fetching from VPS, piggyback on it
  if (_inflight) {
    try {
      const novels = await _inflight
      return NextResponse.json(novels, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30', 'X-Cache': 'HIT' },
      })
    } catch {
      if (cache) return NextResponse.json(cache.data, { headers: { 'X-Cache': 'STALE' } })
      return NextResponse.json({ error: 'Failed to fetch novels' }, { status: 502 })
    }
  }

  // Start a new fetch — all concurrent cache-miss requests will wait on this
  _inflight = fetch(`${VPS_BASE}/novels`, {
    headers: { 'X-Api-Key': VPS_KEY!, 'Content-Type': 'application/json' },
    next: { revalidate: 60 },
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
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        'X-Cache': 'MISS',
      },
    })
  } catch (e) {
    _inflight = null
    if (cache) {
      return NextResponse.json(cache.data, {
        headers: { 'Cache-Control': 'public, s-maxage=30', 'X-Cache': 'STALE' },
      })
    }
    return NextResponse.json({ error: String(e) }, { status: 502 })
  }
}
