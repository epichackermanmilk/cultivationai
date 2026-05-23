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
