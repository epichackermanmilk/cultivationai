import { NextResponse } from 'next/server'
import { admin, SESSION_COOKIE, COOKIE_OPTS, REFRESH_COOKIE, REFRESH_COOKIE_OPTS } from '@/lib/auth-server'
import { parseJsonBody, isValidEmail, isValidPassword } from '@/lib/sanitize'
import { renderEmail } from '@/lib/email'

// ── Per-account lockout policy ────────────────────────────────────────────────
// After MAX_ATTEMPTS consecutive failures, the account is locked for LOCK_MS.
// State is persisted in the `login_attempts` table (survives restarts; shared
// across instances). The owner gets one throttled security email on lockout.
const MAX_ATTEMPTS      = 5
const LOCK_MS           = 15 * 60_000          // 15 minutes
const ALERT_THROTTLE_MS = 30 * 60_000          // at most one alert per 30 min

function clientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

function alertEmailHtml(ip: string, whenUTC: string): string {
  return renderEmail({
    heading: '⚠️ Unusual sign-in activity',
    intro: 'We detected several failed sign-in attempts on your NovelCodex account, so we\'ve temporarily locked it for 15 minutes to keep it safe. If this was you, just wait 15 minutes and try again — or reset your password to get back in right away. If you don\'t recognise this, reset your password now.',
    rows: [['Approx. time', whenUTC], ['From IP', ip]],
    ctaText: 'Reset password',
    ctaUrl: 'https://novelcodex.org/forgot-password',
    footerNote: 'Sent by NovelCodex security · novelcodex.org',
  })
}

// Sends the owner a lockout alert — only for real accounts, throttled, non-fatal.
async function sendLockoutAlert(
  sb: ReturnType<typeof admin>,
  email: string,
  lastAlertISO: string | null,
  ip: string,
) {
  const now = Date.now()
  if (lastAlertISO && now - new Date(lastAlertISO).getTime() < ALERT_THROTTLE_MS) return
  if (!process.env.RESEND_API_KEY) return

  // Only email addresses that actually have an account (no enumeration leak —
  // the attacker never sees this; the response is identical either way).
  const { data: prof } = await sb.from('profiles').select('id').ilike('email', email).maybeSingle()
  if (!prof) return

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from:    'NovelCodex <noreply@novelcodex.org>',
      to:      email,
      subject: 'Security alert: repeated sign-in attempts on your NovelCodex account',
      html:    alertEmailHtml(ip, new Date(now).toUTCString()),
    })
    await sb.from('login_attempts').update({ alert_sent_at: new Date(now).toISOString() }).eq('email', email)
  } catch { /* non-fatal */ }
}

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, 1024)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { email: emailRaw, password: passwordRaw } = parsed.data as { email?: unknown; password?: unknown }
  if (!isValidEmail(emailRaw))
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  if (!isValidPassword(passwordRaw))
    return NextResponse.json({ error: 'Password must be 7–128 characters' }, { status: 400 })

  const email    = (emailRaw as string).trim().toLowerCase()
  const password = passwordRaw as string
  const sb       = admin()
  const now      = Date.now()

  // ── Load attempt record ─────────────────────────────────────────────────────
  const { data: att } = await sb
    .from('login_attempts')
    .select('fail_count, locked_until, alert_sent_at')
    .eq('email', email)
    .maybeSingle()

  // ── Already locked? Reject before even checking the password ────────────────
  const lockedUntilMs = att?.locked_until ? new Date(att.locked_until).getTime() : 0
  if (lockedUntilMs > now) {
    const mins = Math.max(1, Math.ceil((lockedUntilMs - now) / 60_000))
    return NextResponse.json(
      {
        error: `Too many failed attempts. This account is locked for ${mins} more minute${mins === 1 ? '' : 's'}. Reset your password to get back in sooner.`,
        code: 'LOCKED',
        lockedMinutes: mins,
      },
      { status: 423 },
    )
  }

  // If a prior lock has expired, start the counter fresh.
  const priorFails = lockedUntilMs && lockedUntilMs <= now ? 0 : (att?.fail_count ?? 0)

  // ── Attempt sign-in ─────────────────────────────────────────────────────────
  const { data, error } = await sb.auth.signInWithPassword({ email, password })

  if (!error && data?.session) {
    // Success — clear any failure record.
    if (att) { try { await sb.from('login_attempts').delete().eq('email', email) } catch { /* non-fatal */ } }
    const res = NextResponse.json({ email: data.user?.email ?? email })
    res.cookies.set(SESSION_COOKIE, data.session.access_token, COOKIE_OPTS)
    res.cookies.set(REFRESH_COOKIE, data.session.refresh_token, REFRESH_COOKIE_OPTS)
    return res
  }

  // ── Failure — increment and maybe lock ──────────────────────────────────────
  const fails = priorFails + 1

  if (fails >= MAX_ATTEMPTS) {
    const lockedUntil = new Date(now + LOCK_MS).toISOString()
    try {
      await sb.from('login_attempts').upsert(
        { email, fail_count: fails, locked_until: lockedUntil, updated_at: new Date(now).toISOString() },
        { onConflict: 'email' },
      )
    } catch { /* non-fatal */ }
    await sendLockoutAlert(sb, email, att?.alert_sent_at ?? null, clientIp(req))
    return NextResponse.json(
      {
        error: `Too many failed attempts — this account is now locked for 15 minutes for your security. We've emailed the account owner. You can reset your password to get back in right away.`,
        code: 'LOCKED',
        lockedMinutes: 15,
      },
      { status: 423 },
    )
  }

  const remaining = MAX_ATTEMPTS - fails
  try {
    await sb.from('login_attempts').upsert(
      { email, fail_count: fails, locked_until: null, updated_at: new Date(now).toISOString() },
      { onConflict: 'email' },
    )
  } catch { /* non-fatal */ }

  return NextResponse.json(
    {
      error: `Invalid email or password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before this account is temporarily locked.`,
      code: 'INVALID',
      attemptsRemaining: remaining,
    },
    { status: 401 },
  )
}
