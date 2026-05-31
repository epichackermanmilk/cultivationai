import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseJsonBody, isValidEmail, isValidPassword } from '@/lib/sanitize'

const COOKIE      = 'nc_session'
const COOKIE_OPTS = {
  httpOnly: true,
  maxAge:   60 * 60 * 24 * 7,
  path:     '/',
  sameSite: 'lax',
  secure:   process.env.NODE_ENV === 'production',
} as const
const WELCOME_TOKENS = 40   // +10 more granted when the user completes their profile (name + age) = 50 total

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, 1024)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { email: emailRaw, password: passwordRaw, username: usernameRaw, email_marketing_consent: consentRaw } = parsed.data as {
    email?: unknown; password?: unknown; username?: unknown; email_marketing_consent?: unknown
  }
  const emailConsent = consentRaw === true
  if (!isValidEmail(emailRaw))
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  if (!isValidPassword(passwordRaw))
    return NextResponse.json({ error: 'Password must be 8–128 characters' }, { status: 400 })

  // Safe after validation — both are confirmed non-empty strings
  const email    = emailRaw    as string
  const password = passwordRaw as string

  // Username is optional at signup but if provided must be valid
  let username: string | undefined
  if (typeof usernameRaw === 'string' && usernameRaw.trim().length >= 3) {
    const trimmed = usernameRaw.trim()
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed) || trimmed.length > 24)
      return NextResponse.json({ error: 'Username must be 3–24 characters (letters, numbers, underscores)' }, { status: 400 })
    username = trimmed
  }

  const sb = admin()

  // Check username uniqueness before creating user
  if (username) {
    const { data: taken } = await sb
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .maybeSingle()
    if (taken)
      return NextResponse.json({ error: 'Username already taken — please choose another' }, { status: 409 })
  }

  // Create user — auto-confirm email, seed welcome tokens in metadata
  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm:  true,
    user_metadata:  { tokens: WELCOME_TOKENS },
  })
  if (createErr) {
    // Return a friendly message for duplicate emails without leaking internals
    const isDuplicate = createErr.message.toLowerCase().includes('already registered')
                     || createErr.message.toLowerCase().includes('already exists')
                     || createErr.code === '23505'
    return NextResponse.json(
      { error: isDuplicate ? 'An account with this email already exists.' : 'Could not create account. Please try again.' },
      { status: 409 },
    )
  }

  // Sign in to get a session token the client can use
  const { data: session, error: signInErr } = await sb.auth.signInWithPassword({ email, password })
  if (signInErr || !session?.session)
    return NextResponse.json(
      { error: signInErr?.message ?? 'Could not create session' },
      { status: 500 },
    )

  // Also try to write to profiles table if it exists
  try {
    await sb.from('profiles').upsert(
      { id: created.user.id, email, tokens: WELCOME_TOKENS, username: username ?? null, email_marketing_consent: emailConsent },
      { onConflict: 'id' },
    )
  } catch { /* profiles table optional */ }

  // Send welcome email via Resend (non-fatal — never blocks signup)
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'NovelCodex <noreply@novelcodex.org>',
        to: email,
        subject: 'Welcome to NovelCodex — your free tokens are ready',
        html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome to NovelCodex</title></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e4e4e7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="padding:0 0 32px;">
          <span style="font-size:22px;font-weight:800;color:#f59e0b;letter-spacing:-0.5px;">NovelCodex</span>
        </td></tr>

        <!-- Hero -->
        <tr><td style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:40px 36px;">
          <h1 style="margin:0 0 12px;font-size:28px;font-weight:800;color:#fafafa;line-height:1.2;">
            Your free tokens<br/>are waiting.
          </h1>
          <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#a1a1aa;">
            Welcome to NovelCodex — the AI reading companion for web novel fans.
            Ask anything about characters, plot, cultivation systems, and lore across thousands of novels.
          </p>

          <!-- Steps -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
            ${[
              ['Browse', 'Search thousands of web novels across every genre'],
              ['Unlock', 'Activate AI on any novel — free, no token cost'],
              ['Ask',    'Chat with the book — characters, lore, spoilers'],
            ].map(([title, desc]) => `
            <tr><td style="padding:8px 0;border-bottom:1px solid #27272a;">
              <span style="color:#f59e0b;font-weight:700;font-size:13px;">${title}</span>
              <span style="color:#a1a1aa;font-size:13px;"> — ${desc}</span>
            </td></tr>`).join('')}
          </table>

          <a href="https://novelcodex.org/library"
            style="display:inline-block;background:linear-gradient(135deg,#fbbf24 0%,#f59e0b 50%,#d97706 100%);color:#000;font-weight:800;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:100px;">
            Go to Library
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#52525b;">
            You received this because you signed up at novelcodex.org.<br/>
            <a href="https://novelcodex.org/unsubscribe?email=${encodeURIComponent(email)}"
              style="color:#52525b;text-decoration:underline;">Unsubscribe</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
      })
    } catch {
      // Email failure is non-fatal — user is already signed up successfully
    }
  }

  const res = NextResponse.json({ email, tokens: WELCOME_TOKENS })
  res.cookies.set(COOKIE, session.session.access_token, COOKIE_OPTS)
  return res
}
