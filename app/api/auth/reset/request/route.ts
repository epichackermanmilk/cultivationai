import { NextResponse } from 'next/server'
import { admin } from '@/lib/auth-server'
import { parseJsonBody, isValidEmail } from '@/lib/sanitize'
import { renderEmail } from '@/lib/email'

// POST /api/auth/reset/request — start a password reset.
// Generates a Supabase recovery token and emails a reset link via Resend.
// Always responds 200 (no account enumeration) — we never reveal whether the
// address has an account or whether sending succeeded.

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://novelcodex.org'

function resetEmailHtml(link: string): string {
  return renderEmail({
    heading: 'Reset your password',
    intro: 'We received a request to reset the password for your NovelCodex account. Click below to choose a new one — this link expires in 1 hour. If you didn\'t request this, you can safely ignore this email; your password won\'t change.',
    ctaText: 'Reset password',
    ctaUrl: link,
    footerNote: 'Sent by NovelCodex · novelcodex.org',
  })
}

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, 1024)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { email: emailRaw } = parsed.data as { email?: unknown }
  if (!isValidEmail(emailRaw))
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  const email = (emailRaw as string).trim().toLowerCase()

  // Identical response regardless of whether the account exists.
  const ok = NextResponse.json({ ok: true })

  try {
    const sb = admin()
    const { data, error } = await sb.auth.admin.generateLink({ type: 'recovery', email })
    const tokenHash = data?.properties?.hashed_token
    if (error || !tokenHash) return ok   // no such user / OAuth-only — succeed silently

    const link = `${BASE}/reset-password?token=${encodeURIComponent(tokenHash)}`

    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from:    'NovelCodex <noreply@novelcodex.org>',
        to:      email,
        subject: 'Reset your NovelCodex password',
        html:    resetEmailHtml(link),
      })
    }
  } catch { /* never surface failures to the caller */ }

  return ok
}
