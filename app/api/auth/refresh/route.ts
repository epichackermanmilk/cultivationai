import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { admin, SESSION_COOKIE, COOKIE_OPTS, REFRESH_COOKIE, REFRESH_COOKIE_OPTS } from '@/lib/auth-server'

// POST /api/auth/refresh — mint a fresh access token from the stored refresh token,
// so long-lived sessions don't expire after the ~1h access-token lifetime.
export async function POST() {
  const store = await cookies()
  const refresh_token = store.get(REFRESH_COOKIE)?.value
  if (!refresh_token) return NextResponse.json({ error: 'No session' }, { status: 401 })

  const sb = admin()
  const { data, error } = await sb.auth.refreshSession({ refresh_token })

  if (error || !data?.session?.access_token) {
    // Refresh token is dead — clear both cookies so the client signs out cleanly.
    const res = NextResponse.json({ error: 'Session expired' }, { status: 401 })
    res.cookies.set(SESSION_COOKIE, '', { ...COOKIE_OPTS, maxAge: 0 })
    res.cookies.set(REFRESH_COOKIE, '', { ...REFRESH_COOKIE_OPTS, maxAge: 0 })
    return res
  }

  const res = NextResponse.json({ ok: true, email: data.user?.email ?? null })
  res.cookies.set(SESSION_COOKIE, data.session.access_token, COOKIE_OPTS)
  if (data.session.refresh_token) {
    res.cookies.set(REFRESH_COOKIE, data.session.refresh_token, REFRESH_COOKIE_OPTS)
  }
  return res
}
