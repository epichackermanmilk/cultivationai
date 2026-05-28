import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function getUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('nc_session')?.value
  if (!token) return null
  const sb = admin()
  const { data: { user }, error } = await sb.auth.getUser(token)
  if (error || !user) return null
  return { user, sb }
}

// ── GET /api/bookmarks — return user's bookmarks ──────────────────────────────
export async function GET() {
  const auth = await getUser()
  if (!auth) return NextResponse.json({ bookmarks: [] })

  const { user, sb } = auth
  const { data } = await sb
    .from('user_bookmarks')
    .select('slug, title, author, cover_url, genres, total_chapters')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ bookmarks: data ?? [] })
}

// ── POST /api/bookmarks — add a bookmark ──────────────────────────────────────
export async function POST(req: Request) {
  const auth = await getUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { user, sb } = auth

  let body: Record<string, unknown>
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const slug = typeof body.slug === 'string' ? body.slug.trim().slice(0, 120) : ''
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const { error } = await sb.from('user_bookmarks').upsert(
    {
      user_id:        user.id,
      slug,
      title:          typeof body.title === 'string'          ? body.title.slice(0, 500)  : '',
      author:         typeof body.author === 'string'         ? body.author.slice(0, 200) : '',
      cover_url:      typeof body.cover_url === 'string'      ? body.cover_url.slice(0, 1000) : '',
      genres:         Array.isArray(body.genres)              ? (body.genres as unknown[]).slice(0, 20) : [],
      total_chapters: typeof body.total_chapters === 'number' ? body.total_chapters : 0,
    },
    { onConflict: 'user_id,slug' },
  )

  if (error) return NextResponse.json({ error: 'Failed to save bookmark' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// ── DELETE /api/bookmarks — remove a bookmark ─────────────────────────────────
export async function DELETE(req: Request) {
  const auth = await getUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { user, sb } = auth

  let body: Record<string, unknown>
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const slug = typeof body.slug === 'string' ? body.slug.trim() : ''
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  await sb.from('user_bookmarks').delete().eq('user_id', user.id).eq('slug', slug)
  return NextResponse.json({ ok: true })
}
