// POST /api/discord/link/send
// Generates a 6-digit verification code, stores it in profiles,
// and DMs it to the provided Discord user ID via Omega Bot.

import { NextResponse } from 'next/server'
import { cookies }      from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { parseJsonBody, sanitizeText } from '@/lib/sanitize'
import { sendDiscordDM } from '@/lib/discord'

const CODE_TTL_MS = 10 * 60 * 1000  // 10 minutes

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const token = cookieStore.get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  // ── Parse ─────────────────────────────────────────────────────────────────────
  const parsed = await parseJsonBody(req, 256)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const body = parsed.data as Record<string, unknown>
  const discordUserId = sanitizeText(body.discordUserId, 30)

  if (!discordUserId || !/^\d{17,20}$/.test(discordUserId)) {
    return NextResponse.json({ error: 'Invalid Discord User ID — must be a 17–20 digit number' }, { status: 400 })
  }

  // ── Check if this Discord account is already linked to someone else ───────────
  const { data: existing } = await sb
    .from('profiles')
    .select('id')
    .eq('discord_user_id', discordUserId)
    .eq('discord_verified', true)
    .neq('id', user.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'This Discord account is already linked to another NovelCodex account.' }, { status: 409 })
  }

  // ── Generate code ─────────────────────────────────────────────────────────────
  const code    = String(Math.floor(100000 + Math.random() * 900000))  // 6 digits
  const expires = new Date(Date.now() + CODE_TTL_MS).toISOString()

  // Store pending link in profile
  const { error: updateErr } = await sb
    .from('profiles')
    .update({
      discord_link_pending_id:         discordUserId,
      discord_link_code:               code,
      discord_link_code_expires_at:    expires,
    })
    .eq('id', user.id)

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to store verification code' }, { status: 500 })
  }

  // ── Send DM via Omega Bot ─────────────────────────────────────────────────────
  const dmResult = await sendDiscordDM(
    discordUserId,
    `**NovelCodex Verification**\n\nYour verification code is: \`${code}\`\n\nEnter this code at **novelcodex.org/profile** to link your Discord account.\n\n*This code expires in 10 minutes. If you didn't request this, ignore it.*`,
  )

  if (!dmResult.ok) {
    // Common case: user has DMs disabled from non-friends
    const friendly = dmResult.error?.includes('50007')
      ? "Couldn't send you a DM — please enable DMs from server members in Discord settings, then try again."
      : `Discord DM failed: ${dmResult.error ?? 'unknown error'}`
    return NextResponse.json({ error: friendly }, { status: 422 })
  }

  return NextResponse.json({ ok: true, expiresAt: expires })
}
