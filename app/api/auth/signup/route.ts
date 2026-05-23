import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const COOKIE      = 'nc_session'
const COOKIE_OPTS = { httpOnly: true, maxAge: 60 * 60 * 24 * 7, path: '/', sameSite: 'lax' } as const
const WELCOME_TOKENS = 100

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

  // Create user — auto-confirm email, seed 100 tokens in metadata
  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm:  true,
    user_metadata:  { tokens: WELCOME_TOKENS },
  })
  if (createErr)
    return NextResponse.json({ error: createErr.message }, { status: 400 })

  // Sign in to get a session token the client can use
  const { data: session, error: signInErr } = await sb.auth.signInWithPassword({ email, password })
  if (signInErr || !session?.session)
    return NextResponse.json(
      { error: signInErr?.message ?? 'Could not create session' },
      { status: 500 },
    )

  // Also try to write to profiles table if it exists
  try {
    await sb.from('profiles').upsert(
      { id: created.user.id, email, tokens: WELCOME_TOKENS },
      { onConflict: 'id' },
    )
  } catch { /* profiles table optional */ }

  const res = NextResponse.json({ email, tokens: WELCOME_TOKENS })
  res.cookies.set(COOKIE, session.session.access_token, COOKIE_OPTS)
  return res
}
