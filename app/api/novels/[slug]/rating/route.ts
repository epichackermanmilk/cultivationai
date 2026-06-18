// GET/POST /api/novels/[slug]/rating — 1–5 star ratings (one per user per novel).
// Server-side via the service key; auth via the nc_session cookie. Degrades
// gracefully until the novel_ratings table exists.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
const MISSING = (e?: { code?: string; message?: string } | null) =>
  !!e && (e.code === '42P01' || e.code === 'PGRST205' || /schema cache|does not exist|could not find the table/i.test(e.message ?? ''))

interface Ctx { params: Promise<{ slug: string }> }

async function summary(sb: ReturnType<typeof admin>, slug: string, userId?: string) {
  const { data, error } = await sb.from('novel_ratings').select('rating, user_id').eq('slug', slug)
  if (error) {
    if (MISSING(error)) return { average: 0, count: 0, mine: null, enabled: false }
    return { average: 0, count: 0, mine: null, enabled: true }
  }
  const rows = data ?? []
  const count = rows.length
  const average = count ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0
  const mine = userId ? (rows.find(r => r.user_id === userId)?.rating ?? null) : null
  return { average, count, mine, enabled: true }
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { slug } = await params
  const token = (await cookies()).get('nc_session')?.value
  const sb = admin()
  let userId: string | undefined
  if (token) { const { data } = await sb.auth.getUser(token); userId = data.user?.id }
  return NextResponse.json(await summary(sb, slug, userId))
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { slug } = await params
  const token = (await cookies()).get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Sign in to rate' }, { status: 401 })
  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Sign in to rate' }, { status: 401 })

  const { rating } = await req.json().catch(() => ({})) as { rating?: number }
  if (!Number.isInteger(rating) || rating! < 1 || rating! > 5) {
    return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 400 })
  }

  const { error } = await sb.from('novel_ratings').upsert(
    { slug, user_id: user.id, rating, updated_at: new Date().toISOString() },
    { onConflict: 'slug,user_id' },
  )
  if (error) {
    if (MISSING(error)) return NextResponse.json({ error: 'Ratings are not enabled yet' }, { status: 503 })
    return NextResponse.json({ error: 'Could not save rating' }, { status: 500 })
  }
  return NextResponse.json(await summary(sb, slug, user.id))
}
