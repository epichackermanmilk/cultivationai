import { isNovelEmbedded } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

const VPS_BASE   = process.env.VPS_API_URL
const VPS_KEY    = process.env.VPS_API_KEY
const vpsHeaders = { 'X-Api-Key': VPS_KEY!, 'Content-Type': 'application/json' }

const EMBED_COST = 50   // tokens charged to trigger a new embedding

// Only allow safe slug characters (alphanumeric + hyphen, 1-120 chars)
const SLUG_RE = /^[a-z0-9-]{1,120}$/
function validateSlug(slug: string): boolean { return SLUG_RE.test(slug) }

async function vpsPost(path: string) {
  if (!VPS_BASE) throw new Error('No VPS_API_URL')
  const res = await fetch(`${VPS_BASE}${path}`, { method: 'POST', headers: vpsHeaders })
  return res.json()
}

async function vpsGet(path: string) {
  if (!VPS_BASE) throw new Error('No VPS_API_URL')
  const res = await fetch(`${VPS_BASE}${path}`, { headers: vpsHeaders })
  return res.json()
}

export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  // Auth required — embedding is an expensive server-side operation
  const cookieStore = await cookies()
  const token = cookieStore.get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Sign in to unlock novels' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Session expired — please sign in again' }, { status: 401 })

  const { slug } = await params
  if (!validateSlug(slug))
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })

  // ── If already embedded, no cost — just confirm ─────────────────────────
  try {
    const alreadyDone = await isNovelEmbedded(slug)
    if (alreadyDone) return NextResponse.json({ embedded: true, status: 'done' })
  } catch { /* continue — check VPS below */ }

  // ── Novel not yet embedded: check token balance ──────────────────────────
  const { data: profile } = await sb
    .from('profiles')
    .select('tokens')
    .eq('id', user.id)
    .single()

  if (!profile || profile.tokens < EMBED_COST) {
    return NextResponse.json(
      {
        error:  `Unlocking a novel costs ${EMBED_COST} tokens. Visit the shop to get more.`,
        code:   'INSUFFICIENT_TOKENS',
        needed: EMBED_COST,
      },
      { status: 402 },
    )
  }

  // ── Deduct tokens atomically before triggering (non-refundable operation) ─
  const { data: deducted } = await sb
    .from('profiles')
    .update({ tokens: profile.tokens - EMBED_COST })
    .eq('id', user.id)
    .gte('tokens', EMBED_COST)
    .select('tokens')
    .single()

  if (!deducted) {
    // Race condition — someone else used the tokens between our check and update
    return NextResponse.json(
      { error: 'Not enough tokens — please try again.', code: 'INSUFFICIENT_TOKENS' },
      { status: 402 },
    )
  }

  // ── Trigger embedding on VPS ─────────────────────────────────────────────
  try {
    const result = await vpsPost(`/embed/${slug}`)
    return NextResponse.json({
      ...result,
      tokensRemaining: deducted.tokens,
    })
  } catch {
    // VPS down — refund the tokens so user isn't charged for a failed embed
    try {
      await sb
        .from('profiles')
        .update({ tokens: profile.tokens })   // restore original balance
        .eq('id', user.id)
    } catch { /* best-effort refund */ }
    return NextResponse.json({ error: 'Embedding service unavailable' }, { status: 502 })
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!validateSlug(slug))
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
  try {
    // Ground truth: check Supabase
    const embedded = await isNovelEmbedded(slug)
    if (embedded) return NextResponse.json({ embedded: true, status: 'done' })

    // Try VPS for in-progress status
    try {
      const vpsStatus = await vpsGet(`/status/${slug}`)
      return NextResponse.json({ embedded: false, ...vpsStatus })
    } catch {
      return NextResponse.json({ embedded: false, status: 'not_started' })
    }
  } catch {
    return NextResponse.json({ error: 'Failed to check embedding status' }, { status: 500 })
  }
}
