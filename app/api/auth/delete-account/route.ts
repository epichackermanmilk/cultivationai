import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { admin, SESSION_COOKIE, COOKIE_OPTS } from '@/lib/auth-server'
import { parseJsonBody } from '@/lib/sanitize'

// POST /api/auth/delete-account — authenticated. The user must type their exact
// account email to confirm (works for password and Google accounts alike).
// Permanently deletes the account and the profile, then clears the session.

export async function POST(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user?.email)
    return NextResponse.json({ error: 'Session expired — please sign in again' }, { status: 401 })

  const parsed = await parseJsonBody(req, 1024)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { confirmEmail } = parsed.data as { confirmEmail?: unknown }
  if (typeof confirmEmail !== 'string' || confirmEmail.trim().toLowerCase() !== user.email.toLowerCase())
    return NextResponse.json({ error: 'Type your account email exactly to confirm deletion.' }, { status: 400 })

  // Best-effort cleanup of application data, then delete the auth user.
  // (If other tables reference the user with ON DELETE CASCADE they clear too.)
  try { await sb.from('profiles').delete().eq('id', user.id) } catch { /* optional */ }

  const { error: delErr } = await sb.auth.admin.deleteUser(user.id)
  if (delErr)
    return NextResponse.json(
      { error: 'Could not delete your account. Please contact hello@novelcodex.org.' },
      { status: 500 },
    )

  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', { ...COOKIE_OPTS, maxAge: 0 })
  return res
}
