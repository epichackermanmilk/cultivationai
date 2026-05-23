import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!
const COOKIE      = 'nc_session'
const COOKIE_OPTS = { httpOnly: true, maxAge: 60 * 60 * 24 * 7, path: '/', sameSite: 'lax' } as const

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { email, password } = body
  if (!email || !password)
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })

  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
    body:    JSON.stringify({ email, password }),
  })
  const d = await r.json()
  if (!r.ok)
    return NextResponse.json(
      { error: d.error_description || d.msg || 'Invalid email or password' },
      { status: 401 },
    )

  const res = NextResponse.json({ email: d.user?.email ?? email })
  res.cookies.set(COOKIE, d.access_token, COOKIE_OPTS)
  return res
}
