// POST /api/novels/[slug]/epub  { from, to } — download an EPUB of the chapters the
// caller can read. Free for subscribers; 50 tokens otherwise. 1 download/hour.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { getNovelMeta, fetchEpub } from '@/lib/vps'
import { lockThreshold, EPUB_COST, EPUB_COOLDOWN_MS } from '@/lib/locks'

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const token = (await cookies()).get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Sign in to download' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Sign in to download' }, { status: 401 })

  const meta = await getNovelMeta(slug).catch(() => null)
  const total = meta?.total_chapters ?? 0
  if (!total) return NextResponse.json({ error: 'Novel not available' }, { status: 404 })

  const { data: prof } = await sb.from('profiles').select('subscription_active').eq('id', user.id).maybeSingle()
  const subscribed = !!prof?.subscription_active
  const maxReadable = subscribed ? total : lockThreshold(total)

  const reqBody = await req.json().catch(() => ({})) as { from?: number; to?: number }
  const from = clamp(Math.floor(reqBody.from ?? 1), 1, maxReadable)
  const to = clamp(Math.floor(reqBody.to ?? maxReadable), from, maxReadable)
  if (maxReadable < 1) return NextResponse.json({ error: 'No downloadable chapters' }, { status: 400 })

  // ── Rate limit: 1 download / hour (graceful if the table isn't created yet) ──
  try {
    const since = new Date(Date.now() - EPUB_COOLDOWN_MS).toISOString()
    const { data: recent, error } = await sb.from('epub_downloads').select('created_at').eq('user_id', user.id).gte('created_at', since).limit(1)
    if (!error && recent && recent.length) {
      return NextResponse.json({ error: 'You can download one EPUB per hour. Try again shortly.', code: 'RATE_LIMIT' }, { status: 429 })
    }
  } catch { /* table missing — skip limit until SQL is run */ }

  // Build the EPUB first so we never charge for a failed export.
  const epub = await fetchEpub(slug, from, to)
  if (!epub) return NextResponse.json({ error: 'Could not build EPUB' }, { status: 502 })

  // Charge non-subscribers.
  let spent = 0
  if (!subscribed) {
    const { data: newBalance, error: rpcErr } = await sb.rpc('debit_tokens', { p_user: user.id, p_amount: EPUB_COST })
    if (rpcErr) return NextResponse.json({ error: 'Could not process payment' }, { status: 500 })
    if (newBalance === null) return NextResponse.json({ error: `Not enough tokens (need ${EPUB_COST}).`, code: 'INSUFFICIENT' }, { status: 402 })
    spent = EPUB_COST
  }

  try { await sb.from('epub_downloads').insert({ user_id: user.id, slug, from_chapter: from, to_chapter: to, tokens_spent: spent }) } catch { /* non-fatal */ }

  return new NextResponse(epub.buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/epub+zip',
      'Content-Disposition': `attachment; filename="${epub.filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
