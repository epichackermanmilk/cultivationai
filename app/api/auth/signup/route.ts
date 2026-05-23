import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const COOKIE      = 'nc_session'
const COOKIE_OPTS = { httpOnly: true, maxAge: 60 * 60 * 24 * 7, path: '/', sameSite: 'lax' } as const

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { email, password } = body
  if (!email || !password)
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })

  const sb = admin()

  // Create user via admin API (auto-confirms email)
  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (createErr)
    return NextResponse.json({ error: createErr.message }, { status: 400 })

  // Sign in to get session token
  const { data: session, error: signInErr } = await sb.auth.signInWithPassword({ email, password })
  if (signInErr || !session?.session)
    return NextResponse.json({ error: signInErr?.message ?? 'Could not create session' }, { status: 500 })

  // Create profile row (100 welcome tokens)
  try {
    await sb.from('profiles').upsert(
      { id: created.user.id, email, tokens: 100 },
      { onConflict: 'id' },
    )
  } catch { /* table may not exist yet — run supabase/profiles.sql */ }

  const res = NextResponse.json({ email, tokens: 100 })
  res.cookies.set(COOKIE, session.session.access_token, COOKIE_OPTS)
  return res
}
