// POST /api/novels/[slug]/unlock  { chapter } — unlock one locked chapter for 2
// tokens (atomic debit via debit_tokens RPC). Subscribers already have access and
// are never charged. Idempotent: re-unlocking an owned chapter costs nothing.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { UNLOCK_COST } from '@/lib/locks'

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const token = (await cookies()).get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Sign in to unlock chapters' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Sign in to unlock chapters' }, { status: 401 })

  const { chapter } = await req.json().catch(() => ({})) as { chapter?: number }
  if (!Number.isInteger(chapter) || chapter! < 1) return NextResponse.json({ error: 'Invalid chapter' }, { status: 400 })

  // Subscribers read locked chapters for free.
  const { data: prof } = await sb.from('profiles').select('subscription_active').eq('id', user.id).maybeSingle()
  if (prof?.subscription_active) return NextResponse.json({ ok: true, viaSub: true })

  // Already unlocked? No charge.
  const { data: owned } = await sb.from('chapter_unlocks').select('chapter_number').eq('user_id', user.id).eq('slug', slug).eq('chapter_number', chapter).maybeSingle()
  if (owned) return NextResponse.json({ ok: true, alreadyOwned: true })

  // Atomic debit (returns NULL when insufficient).
  const { data: newBalance, error: rpcErr } = await sb.rpc('debit_tokens', { p_user: user.id, p_amount: UNLOCK_COST })
  if (rpcErr) return NextResponse.json({ error: 'Could not process unlock' }, { status: 500 })
  if (newBalance === null) return NextResponse.json({ error: 'Not enough tokens', code: 'INSUFFICIENT' }, { status: 402 })

  await sb.from('chapter_unlocks').upsert({ user_id: user.id, slug, chapter_number: chapter }, { onConflict: 'user_id,slug,chapter_number' })
  return NextResponse.json({ ok: true, tokens: newBalance })
}
