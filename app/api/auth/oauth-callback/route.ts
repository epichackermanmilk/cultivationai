import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseJsonBody } from '@/lib/sanitize'
import { REFRESH_COOKIE, REFRESH_COOKIE_OPTS } from '@/lib/auth-server'

const COOKIE      = 'nc_session'
const COOKIE_OPTS = {
  httpOnly: true,
  maxAge:   60 * 60 * 24 * 7,   // 7 days
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
  const parsed = await parseJsonBody(req, 2048)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { access_token, refresh_token } = parsed.data as { access_token?: unknown; refresh_token?: unknown }
  if (!access_token || typeof access_token !== 'string' || access_token.length < 20) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  // Validate the token by fetching the user — this also implicitly verifies the JWT
  const sb = admin()
  const { data: { user }, error } = await sb.auth.getUser(access_token)
  if (error || !user) {
    return NextResponse.json({ error: 'Token validation failed' }, { status: 401 })
  }

  // Ensure a profiles row exists (Google OAuth users won't trigger the DB trigger
  // if the trigger was created after their account, or if Supabase didn't fire it)
  try {
    await sb.from('profiles').upsert(
      { id: user.id, email: user.email ?? '' },
      { onConflict: 'id', ignoreDuplicates: true },
    )
  } catch { /* non-fatal — profile row may already exist */ }

  const res = NextResponse.json({ ok: true, email: user.email })
  res.cookies.set(COOKIE, access_token, COOKIE_OPTS)
  if (typeof refresh_token === 'string' && refresh_token.length > 20) {
    res.cookies.set(REFRESH_COOKIE, refresh_token, REFRESH_COOKIE_OPTS)
  }
  return res
}
