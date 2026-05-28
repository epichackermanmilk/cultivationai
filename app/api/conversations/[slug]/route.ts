import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

interface RouteContext { params: Promise<{ slug: string }> }

// ── GET — load saved conversation for this user+slug ─────────────────────────
export async function GET(_req: Request, { params }: RouteContext) {
  const cookieStore = await cookies()
  const token = cookieStore.get('nc_session')?.value
  // Not signed in → return empty (no error; graceful fallback)
  if (!token) return NextResponse.json({ messages: [] })

  const sb = admin()
  const { data: { user }, error } = await sb.auth.getUser(token)
  if (error || !user) return NextResponse.json({ messages: [] })

  const { slug } = await params

  try {
    const { data } = await sb
      .from('conversations')
      .select('messages')
      .eq('user_id', user.id)
      .eq('slug', slug)
      .maybeSingle()

    return NextResponse.json({ messages: data?.messages ?? [] })
  } catch {
    // Table may not exist yet — return empty gracefully
    return NextResponse.json({ messages: [] })
  }
}

// ── PUT — upsert full message array for this user+slug ───────────────────────
export async function PUT(req: Request, { params }: RouteContext) {
  const cookieStore = await cookies()
  const token = cookieStore.get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error } = await sb.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { messages?: unknown[]; novel_title?: string }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  const { slug } = await params

  // Keep at most 100 messages (prevent unbounded growth)
  const messages    = Array.isArray(body.messages) ? body.messages.slice(-100) : []
  const novel_title = typeof body.novel_title === 'string' ? body.novel_title.slice(0, 300) : ''

  // Validate message shape — each must be { role: 'user'|'assistant', content: string }
  const cleaned = messages.filter(
    (m): m is { role: string; content: string } =>
      typeof m === 'object' && m !== null &&
      ((m as { role?: unknown }).role === 'user' || (m as { role?: unknown }).role === 'assistant') &&
      typeof (m as { content?: unknown }).content === 'string'
  ).map(m => ({ role: m.role, content: (m.content as string).slice(0, 4000) }))

  try {
    await sb.from('conversations').upsert(
      {
        user_id:     user.id,
        slug,
        novel_title,
        messages:    cleaned,
        updated_at:  new Date().toISOString(),
      },
      { onConflict: 'user_id,slug' },
    )
    return NextResponse.json({ ok: true })
  } catch {
    // Table may not exist yet — fail silently so the chat still works
    return NextResponse.json({ ok: false, note: 'conversations table not yet created' })
  }
}
