import { NextResponse } from 'next/server'

const VPS_BASE = process.env.VPS_API_URL
const VPS_KEY  = process.env.VPS_API_KEY

// ── In-process cache — avoids hitting VPS on every page load ──────────────────
interface Cache { data: unknown[]; ts: number }
let cache: Cache | null = null
const CACHE_TTL_MS = 90_000 // 90 seconds

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

  try {
    const res = await fetch(`${VPS_BASE}/novels`, {
      headers: { 'X-Api-Key': VPS_KEY!, 'Content-Type': 'application/json' },
      // Also tell Next.js fetch cache to revalidate every 60s (ISR-compatible)
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      // Return stale cache if available rather than a hard error
      if (cache) {
        return NextResponse.json(cache.data, {
          headers: { 'Cache-Control': 'public, s-maxage=30', 'X-Cache': 'STALE' },
        })
      }
      return NextResponse.json({ error: `VPS error: ${res.status}` }, { status: 502 })
    }

    const data   = await res.json()
    const novels: unknown[] = Array.isArray(data) ? data : (data.novels ?? [])

    // Update cache
    cache = { data: novels, ts: now }

    return NextResponse.json(novels, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        'X-Cache': 'MISS',
      },
    })
  } catch (e) {
    if (cache) {
      return NextResponse.json(cache.data, {
        headers: { 'Cache-Control': 'public, s-maxage=30', 'X-Cache': 'STALE' },
      })
    }
    return NextResponse.json({ error: String(e) }, { status: 502 })
  }
}
