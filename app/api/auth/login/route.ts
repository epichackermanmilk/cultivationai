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

  const { data, error } = await admin().auth.signInWithPassword({ email, password })
  if (error || !data?.session)
    return NextResponse.json(
      { error: error?.message ?? 'Invalid email or password' },
      { status: 401 },
    )

  const res = NextResponse.json({ email: data.user?.email ?? email })
  res.cookies.set(COOKIE, data.session.access_token, COOKIE_OPTS)
  return res
}
