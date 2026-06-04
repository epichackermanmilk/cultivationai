import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { admin, SESSION_COOKIE } from '@/lib/auth-server'
import { parseJsonBody, isValidEmail } from '@/lib/sanitize'

// POST /api/auth/change-email — authenticated. Requires the current password
// (re-auth). Auto-confirms the new email to match signup behaviour.

export async function POST(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user?.email)
    return NextResponse.json({ error: 'Session expired — please sign in again' }, { status: 401 })

  const parsed = await parseJsonBody(req, 2048)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { newEmail, currentPassword } = parsed.data as { newEmail?: unknown; currentPassword?: unknown }
  if (!isValidEmail(newEmail))
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
  if (typeof currentPassword !== 'string' || !currentPassword)
    return NextResponse.json({ error: 'Enter your current password' }, { status: 400 })

  const target = (newEmail as string).trim().toLowerCase()
  if (target === user.email.toLowerCase())
    return NextResponse.json({ error: 'That is already your email' }, { status: 400 })

  // Re-auth with current password.
  const { error: signErr } = await sb.auth.signInWithPassword({ email: user.email, password: currentPassword })
  if (signErr)
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })

  const { error: updErr } = await sb.auth.admin.updateUserById(user.id, { email: target, email_confirm: true })
  if (updErr) {
    const msg = updErr.message?.toLowerCase() ?? ''
    const dup = msg.includes('already') || msg.includes('registered') || msg.includes('exists')
    return NextResponse.json(
      { error: dup ? 'That email is already in use.' : 'Could not update email.' },
      { status: dup ? 409 : 500 },
    )
  }

  // Keep the profiles row in sync (non-fatal).
  try { await sb.from('profiles').update({ email: target }).eq('id', user.id) } catch { /* optional */ }

  return NextResponse.json({ ok: true, email: target })
}
