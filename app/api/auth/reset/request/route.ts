import { NextResponse } from 'next/server'
import { admin } from '@/lib/auth-server'
import { parseJsonBody, isValidEmail } from '@/lib/sanitize'

// POST /api/auth/reset/request — start a password reset.
// Generates a Supabase recovery token and emails a reset link via Resend.
// Always responds 200 (no account enumeration) — we never reveal whether the
// address has an account or whether sending succeeded.

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://novelcodex.org'

function resetEmailHtml(link: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reset your NovelCodex password</title></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e4e4e7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="padding:0 0 32px;">
          <span style="font-size:22px;font-weight:800;color:#f59e0b;letter-spacing:-0.5px;">NovelCodex</span>
        </td></tr>
        <tr><td style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:40px 36px;">
          <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#fafafa;line-height:1.2;">
            Reset your password
          </h1>
          <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#a1a1aa;">
            We received a request to reset the password for your NovelCodex account.
            Click the button below to choose a new password. This link expires in 1 hour.
          </p>
          <a href="${link}"
            style="display:inline-block;background:linear-gradient(135deg,#fbbf24 0%,#f59e0b 50%,#d97706 100%);color:#000;font-weight:800;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:100px;">
            Reset Password
          </a>
          <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:#71717a;">
            If you didn't request this, you can safely ignore this email — your password won't change.
          </p>
          <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#52525b;word-break:break-all;">
            Or paste this link into your browser:<br/>${link}
          </p>
        </td></tr>
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#52525b;">Sent by NovelCodex · novelcodex.org</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
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
