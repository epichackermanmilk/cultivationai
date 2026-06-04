import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { admin, SESSION_COOKIE } from '@/lib/auth-server'
import { parseJsonBody, isValidPassword } from '@/lib/sanitize'

// POST /api/auth/change-password — authenticated. Requires the current password
// (re-auth) before setting a new one.

export async function POST(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user?.email)
    return NextResponse.json({ error: 'Session expired — please sign in again' }, { status: 401 })

  const parsed = await parseJsonBody(req, 2048)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { currentPassword, newPassword } = parsed.data as { currentPassword?: unknown; newPassword?: unknown }
  if (typeof currentPassword !== 'string' || !currentPassword)
    return NextResponse.json({ error: 'Enter your current password' }, { status: 400 })
  if (!isValidPassword(newPassword))
    return NextResponse.json({ error: 'New password must be 7–128 characters' }, { status: 400 })

  // Verify current password by attempting a sign-in with it.
  const { error: signErr } = await sb.auth.signInWithPassword({ email: user.email, password: currentPassword })
  if (signErr)
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })

  const { error: updErr } = await sb.auth.admin.updateUserById(user.id, { password: newPassword as string })
  if (updErr)
    return NextResponse.json({ error: 'Could not change password. Please try again.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
