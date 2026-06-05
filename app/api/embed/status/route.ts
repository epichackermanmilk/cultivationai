import { NextRequest, NextResponse } from 'next/server'
import { isNovelEmbedded } from '@/lib/supabase'

// GET /api/embed/status?slugs=a,b,c
// Lightweight readiness check (no indexing triggered) so the multi-chat client can
// poll and auto-answer once the selected novels finish indexing.
export async function GET(req: NextRequest) {
  const raw   = req.nextUrl.searchParams.get('slugs') || ''
  const slugs = raw.split(',').map(s => s.trim()).filter(Boolean).slice(0, 10)
  if (!slugs.length) return NextResponse.json({ allReady: true, ready: [], pending: [] })

  const results = await Promise.all(
    slugs.map(async s => ({ slug: s, ready: await isNovelEmbedded(s).catch(() => false) })),
  )
  const ready   = results.filter(r => r.ready).map(r => r.slug)
  const pending = results.filter(r => !r.ready).map(r => r.slug)
  return NextResponse.json({ allReady: pending.length === 0, ready, pending })
}
