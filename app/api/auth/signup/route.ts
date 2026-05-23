import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseJsonBody, isValidEmail, isValidPassword } from '@/lib/sanitize'

const COOKIE      = 'nc_session'
const COOKIE_OPTS = {
  httpOnly: true,
  maxAge:   60 * 60 * 24 * 7,
  path:     '/',
  sameSite: 'lax',
  secure:   process.env.NODE_ENV === 'production',
} as const
const WELCOME_TOKENS = 100

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, 1024)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { email, password } = parsed.data as { email?: unknown; password?: unknown }
  if (!isValidEmail(email))
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  if (!isValidPassword(password))
    return NextResponse.json({ error: 'Password must be 8–128 characters' }, { status: 400 })

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
