// GET/POST /api/novels/[slug]/comments — novel comments.
// Server-side via the service key; auth via the nc_session cookie. Degrades
// gracefully (empty list / 503) until the novel_comments table exists.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
// Table-not-created yet — Postgres (42P01) or PostgREST schema-cache miss (PGRST205).
const MISSING = (e?: { code?: string; message?: string } | null) =>
  !!e && (e.code === '42P01' || e.code === 'PGRST205' || /schema cache|does not exist|could not find the table/i.test(e.message ?? ''))

interface Ctx { params: Promise<{ slug: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { slug } = await params
  const sb = admin()
  const { data, error } = await sb
    .from('novel_comments')
    .select('id, user_id, author_name, author_avatar, body, created_at')
    .eq('slug', slug)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) {
    if (MISSING(error)) return NextResponse.json({ comments: [], enabled: false })
    return NextResponse.json({ comments: [] })
  }
  return NextResponse.json({ comments: data ?? [], enabled: true })
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { slug } = await params
  const token = (await cookies()).get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Sign in to comment' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Sign in to comment' }, { status: 401 })

  const { body } = await req.json().catch(() => ({})) as { body?: string }
  const text = (body ?? '').trim()
  if (!text) return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 })
  if (text.length > 2000) return NextResponse.json({ error: 'Comment too long (max 2000 chars)' }, { status: 400 })

  // Author identity (denormalised onto the row so listing needs no per-user lookup).
  let author_name: string | null = (user.user_metadata?.username as string | undefined) ?? null
  if (!author_name) {
    const { data: prof } = await sb.from('profiles').select('username').eq('id', user.id).maybeSingle()
    author_name = prof?.username ?? (user.email ? user.email.split('@')[0] : 'Reader')
  }
  const author_avatar = (user.user_metadata?.avatar_url as string | null | undefined) ?? null

  const { data, error } = await sb
    .from('novel_comments')
    .insert({ slug, user_id: user.id, author_name, author_avatar, body: text })
    .select('id, user_id, author_name, author_avatar, body, created_at')
    .single()

  if (error) {
    if (MISSING(error)) return NextResponse.json({ error: 'Comments are not enabled yet' }, { status: 503 })
    return NextResponse.json({ error: 'Could not post comment' }, { status: 500 })
  }
  return NextResponse.json({ comment: data })
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { slug } = await params
  const token = (await cookies()).get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json().catch(() => ({})) as { id?: string }
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  // Only the author can delete their own comment.
  await sb.from('novel_comments').delete().eq('id', id).eq('user_id', user.id).eq('slug', slug)
  return NextResponse.json({ ok: true })
}
