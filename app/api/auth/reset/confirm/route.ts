import { NextResponse } from 'next/server'
import { admin, SESSION_COOKIE, COOKIE_OPTS } from '@/lib/auth-server'
import { parseJsonBody, isValidPassword } from '@/lib/sanitize'

// POST /api/auth/reset/confirm — complete a password reset.
// Verifies the Supabase recovery token (single-use, ~1h expiry), sets the new
// password, and signs the user in with a fresh session.

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, 2048)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { token: tokenRaw, password: passwordRaw } = parsed.data as { token?: unknown; password?: unknown }
  if (typeof tokenRaw !== 'string' || !tokenRaw.trim())
    return NextResponse.json({ error: 'Invalid or missing reset token' }, { status: 400 })
  if (!isValidPassword(passwordRaw))
    return NextResponse.json({ error: 'Password must be 7–128 characters' }, { status: 400 })

  const token    = tokenRaw.trim()
  const password = passwordRaw as string
  const sb       = admin()

  // Validate the recovery token. token_hash comes straight from generateLink.
  const { data: verified, error: verifyErr } = await sb.auth.verifyOtp({ type: 'recovery', token_hash: token })
  if (verifyErr || !verified?.user?.id)
    return NextResponse.json(
      { error: 'This reset link is invalid or has expired. Please request a new one.' },
      { status: 400 },
    )

  const { error: updErr } = await sb.auth.admin.updateUserById(verified.user.id, { password })
  if (updErr)
    return NextResponse.json({ error: 'Could not update your password. Please try again.' }, { status: 500 })

  // Sign in fresh so they're logged in immediately after resetting.
  const res = NextResponse.json({ ok: true, email: verified.user.email ?? null })
  try {
    const { data: signIn } = await sb.auth.signInWithPassword({ email: verified.user.email!, password })
    if (signIn?.session?.access_token)
      res.cookies.set(SESSION_COOKIE, signIn.session.access_token, COOKIE_OPTS)
  } catch { /* password is set; they can sign in manually */ }

  return res
}
