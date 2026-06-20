// GET /api/novels/popular?window=day|week|month|all — ordered list of the most-read
// novel slugs in that window (via the popular_novels RPC). The homepage maps these
// slugs onto its loaded catalogue. Returns { slugs: [] } if there's no data yet.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

const DAYS: Record<string, number> = { day: 1, week: 7, month: 30 }

export async function GET(req: NextRequest) {
  const w = new URL(req.url).searchParams.get('window') ?? 'week'
  const days = DAYS[w] // undefined → all-time
  const since = days ? new Date(Date.now() - days * 86_400_000).toISOString() : null
  try {
    const sb = admin()
    const { data, error } = await sb.rpc('popular_novels', { p_since: since, p_limit: 24 })
    if (error) return NextResponse.json({ slugs: [] })
    const slugs = (data ?? []).map((r: { slug: string }) => r.slug)
    return NextResponse.json({ slugs }, { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } })
  } catch {
    return NextResponse.json({ slugs: [] })
  }
}
