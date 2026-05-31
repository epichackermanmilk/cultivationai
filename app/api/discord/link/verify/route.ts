// POST /api/discord/link/verify
// Checks the 6-digit code, links the Discord account, syncs roles.

import { NextResponse } from 'next/server'
import { cookies }      from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { parseJsonBody, sanitizeText } from '@/lib/sanitize'
import { syncDiscordRoles }            from '@/lib/discord'

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
  const code = sanitizeText(body.code, 10)?.trim()

  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Invalid code format — must be 6 digits' }, { status: 400 })
  }

  // ── Load profile ──────────────────────────────────────────────────────────────
  const { data: profile } = await sb
    .from('profiles')
    .select('discord_link_code, discord_link_code_expires_at, discord_link_pending_id')
    .eq('id', user.id)
    .single()

  if (!profile?.discord_link_code) {
    return NextResponse.json({ error: 'No verification pending — send a new code first' }, { status: 400 })
  }

  // ── Check expiry ──────────────────────────────────────────────────────────────
  if (new Date(profile.discord_link_code_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Code expired — send a new one' }, { status: 400 })
  }

  // ── Check code ────────────────────────────────────────────────────────────────
  if (profile.discord_link_code !== code) {
    return NextResponse.json({ error: 'Incorrect code' }, { status: 400 })
  }

  const discordUserId = profile.discord_link_pending_id
  if (!discordUserId) {
    return NextResponse.json({ error: 'No pending Discord account — start over' }, { status: 400 })
  }

  // ── Link account ──────────────────────────────────────────────────────────────
  const { error: updateErr } = await sb
    .from('profiles')
    .update({
      discord_user_id:              discordUserId,
      discord_verified:             true,
      discord_link_code:            null,
      discord_link_code_expires_at: null,
      discord_link_pending_id:      null,
    })
    .eq('id', user.id)

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to link account' }, { status: 500 })
  }

  // ── Sync Discord roles (fire-and-forget — don't block response) ───────────────
  syncDiscordRoles(user.id).catch(e => console.error('[discord/verify] role sync error:', e))

  return NextResponse.json({ ok: true, discordUserId })
}
