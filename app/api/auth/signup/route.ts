import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!
const COOKIE      = 'nc_session'
const COOKIE_OPTS = { httpOnly: true, maxAge: 60 * 60 * 24 * 7, path: '/', sameSite: 'lax' } as const

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { email, password } = body
  if (!email || !password)
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })

  // Create user via Supabase Auth REST API (service key authorises the call)
  const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
    body:    JSON.stringify({ email, password }),
  })
  const d = await r.json()
  if (!r.ok)
    return NextResponse.json({ error: d.msg || d.error_description || 'Signup failed' }, { status: 400 })

  const userId      = d.user?.id ?? d.id
  const accessToken = d.access_token as string | undefined

  // Create profile row (100 welcome tokens)
  const sb = getSupabase()
  await sb.from('profiles').upsert({ id: userId, email, tokens: 100 }, { onConflict: 'id' })

  const res = NextResponse.json({ email, tokens: 100 })
  if (accessToken) res.cookies.set(COOKIE, accessToken, COOKIE_OPTS)
  return res
}
