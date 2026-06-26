import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseJsonBody, isValidEmail, isValidPassword } from '@/lib/sanitize'
import { REFRESH_COOKIE, REFRESH_COOKIE_OPTS } from '@/lib/auth-server'
import { renderEmail } from '@/lib/email'

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
  // Auto-subscribe new accounts to the newsletter by default — they can
  // unsubscribe anytime (every email has an unsubscribe link). Only an explicit
  // `false` opts out at signup.
  const emailConsent = consentRaw !== false
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
        html: renderEmail({
          heading: `Your ${WELCOME_TOKENS} free tokens<br/>are waiting.`,
          intro: 'Welcome to NovelCodex — read thousands of cultivation, xianxia and fantasy web novels, free. Your tokens unlock the extras: AI chat, character roleplay, recommendations, and EPUB downloads.',
          rows: [
            ['Browse', 'Thousands of web novels across every genre'],
            ['Read', 'Open any novel — free, instantly, on any device'],
            ['Go deeper', 'Optional AI chat, character roleplay & recommendations'],
          ],
          ctaText: 'Start reading',
          ctaUrl: 'https://novelcodex.org/browse',
          footerNote: 'You received this because you signed up at novelcodex.org.',
          unsubscribeEmail: email,
        }),
      })

      // Add to the marketing audience (newsletter list) so account-holders
      // receive updates. Auto-subscribed; they can unsubscribe anytime.
      if (emailConsent && process.env.RESEND_AUDIENCE_ID) {
        try {
          await resend.contacts.create({
            email,
            firstName:    username ?? undefined,
            unsubscribed: false,
            audienceId:   process.env.RESEND_AUDIENCE_ID,
          })
        } catch { /* non-fatal — contact may already exist */ }
      }
    } catch {
      // Email failure is non-fatal — user is already signed up successfully
    }
  }

  const res = NextResponse.json({ email, tokens: WELCOME_TOKENS })
  res.cookies.set(COOKIE, session.session.access_token, COOKIE_OPTS)
  res.cookies.set(REFRESH_COOKIE, session.session.refresh_token, REFRESH_COOKIE_OPTS)
  return res
}
