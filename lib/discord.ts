// lib/discord.ts
// Discord role management for NovelCodex ↔ Discord server integration.
// Uses the Omega Bot token to assign/remove roles without OAuth2.

import { createClient } from '@supabase/supabase-js'

// ── Constants ──────────────────────────────────────────────────────────────────
export const DISCORD_GUILD_ID = '1508204543429709895'  // server (unchanged)

// Channel-category that the purchase roles unlock. Access is granted by Discord's
// own role→category permission settings (configured in the server, not here) —
// the bot only assigns the roles below. Kept for reference/future use.
export const DISCORD_PURCHASE_CATEGORY_ID = '1511269693586018324'

export const DISCORD_ROLES = {
  NovelCodex:  '1510606615290843136',  // base — any linked account
  Reader:      '1510606693388648649',  // active Reader sub ($4.99/mo)
  Scholar:     '1510606690758951093',  // active Scholar sub ($9.99/mo)
  Seeker:      '1510606687269158943',  // 550+ tokens ever purchased (~$5)
  Sage:        '1510606684173635644',  // 3500+ tokens ever purchased (~$25)
  ImmortalSage:'1510606680696688764',  // 20000+ tokens ever purchased (~$100)
} as const

// All role IDs we manage (used to safely diff against other roles Omega Bot assigns)
export const NC_MANAGED_ROLES: ReadonlySet<string> = new Set<string>(Object.values(DISCORD_ROLES))

const DISCORD_API = 'https://discord.com/api/v10'

function botHeaders() {
  return {
    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN!}`,
    'Content-Type': 'application/json',
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Send a DM to a Discord user via the bot. Returns ok/error. */
export async function sendDiscordDM(discordUserId: string, content: string): Promise<{ ok: boolean; error?: string }> {
  try {
    // 1. Open / get the DM channel
    const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
      method:  'POST',
      headers: botHeaders(),
      body:    JSON.stringify({ recipient_id: discordUserId }),
    })
    if (!dmRes.ok) {
      const err = await dmRes.json().catch(() => ({}))
      return { ok: false, error: (err as { message?: string }).message ?? `DM channel error ${dmRes.status}` }
    }
    const dmChannel = await dmRes.json() as { id: string }

    // 2. Send the message
    const msgRes = await fetch(`${DISCORD_API}/channels/${dmChannel.id}/messages`, {
      method:  'POST',
      headers: botHeaders(),
      body:    JSON.stringify({ content }),
    })
    if (!msgRes.ok) {
      return { ok: false, error: `Message send error ${msgRes.status}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

/** Structured outcome so callers can surface real status instead of failing silently. */
export type DiscordSyncStatus =
  | 'synced'         // roles applied (or already correct)
  | 'no_bot_token'   // server misconfig — DISCORD_BOT_TOKEN missing
  | 'no_link'        // user has no verified Discord linked
  | 'not_in_server'  // user hasn't joined the guild — can't assign roles
  | 'forbidden'      // bot lacks MANAGE_ROLES or role hierarchy is wrong
  | 'error'          // network / unexpected
export interface DiscordSyncResult {
  ok: boolean
  status: DiscordSyncStatus
  appliedRoles?: string[]
  error?: string
}

type MemberResult =
  | { kind: 'ok'; roles: string[] }
  | { kind: 'not_in_server' }
  | { kind: 'error'; status: number; error: string }

/** Get a guild member's current roles, distinguishing "not in server" from errors. */
async function getMemberRoles(discordUserId: string): Promise<MemberResult> {
  try {
    const res = await fetch(`${DISCORD_API}/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}`, { headers: botHeaders() })
    if (res.status === 404) return { kind: 'not_in_server' }
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { kind: 'error', status: res.status, error: body.slice(0, 200) }
    }
    const member = await res.json() as { roles: string[] }
    return { kind: 'ok', roles: member.roles ?? [] }
  } catch (e) {
    return { kind: 'error', status: 0, error: String(e) }
  }
}

/** Set a member's full role list (preserving non-NC roles). Returns status. */
async function setMemberRoles(discordUserId: string, newRoles: string[]): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    const res = await fetch(`${DISCORD_API}/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}`, {
      method:  'PATCH',
      headers: botHeaders(),
      body:    JSON.stringify({ roles: newRoles }),
    })
    if (res.ok) return { ok: true, status: res.status }
    const body = await res.text().catch(() => '')
    return { ok: false, status: res.status, error: body.slice(0, 200) }
  } catch (e) {
    return { ok: false, status: 0, error: String(e) }
  }
}

// ── Main sync function ─────────────────────────────────────────────────────────

/**
 * Compute the correct NC roles for a user and apply them to Discord.
 * Safe to call on every purchase / subscription / verification change.
 * Returns a structured result so callers can detect + surface silent failures
 * (e.g. user not in the server, or the bot can't manage the roles).
 */
export async function syncDiscordRoles(supabaseUserId: string): Promise<DiscordSyncResult> {
  if (!process.env.DISCORD_BOT_TOKEN) return { ok: false, status: 'no_bot_token' }

  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: profile } = await sb
    .from('profiles')
    .select('discord_user_id, discord_verified, tokens_ever_purchased, subscription_active, subscription_tier')
    .eq('id', supabaseUserId)
    .maybeSingle()

  if (!profile?.discord_user_id || !profile.discord_verified) return { ok: false, status: 'no_link' }

  const discordId  = profile.discord_user_id
  const tokensEver = (profile.tokens_ever_purchased as number) ?? 0
  const subActive  = !!profile.subscription_active
  // The Stripe webhook stores the tier lowercased ('scholar' / 'reader'), so
  // compare case-insensitively here — otherwise Scholar subs never get the role.
  const subTier    = ((profile.subscription_tier as string | null) ?? '').toLowerCase()

  // ── Determine desired NC roles ────────────────────────────────────────────────
  const desired = new Set<string>()
  desired.add(DISCORD_ROLES.NovelCodex)               // base — always once linked
  if (subActive && subTier === 'scholar') {
    desired.add(DISCORD_ROLES.Scholar)
    desired.add(DISCORD_ROLES.Reader)                 // Scholar is a superset
  } else if (subActive) {
    desired.add(DISCORD_ROLES.Reader)
  }
  if (tokensEver >= 20000) {
    desired.add(DISCORD_ROLES.ImmortalSage); desired.add(DISCORD_ROLES.Sage); desired.add(DISCORD_ROLES.Seeker)
  } else if (tokensEver >= 3500) {
    desired.add(DISCORD_ROLES.Sage); desired.add(DISCORD_ROLES.Seeker)
  } else if (tokensEver >= 550) {
    desired.add(DISCORD_ROLES.Seeker)
  }

  // ── Get current roles ─────────────────────────────────────────────────────────
  const member = await getMemberRoles(discordId)
  if (member.kind === 'not_in_server') return { ok: false, status: 'not_in_server' }
  if (member.kind === 'error') {
    console.error('[discord] getMemberRoles error', member.status, member.error)
    return { ok: false, status: 'error', error: `member fetch ${member.status}` }
  }

  const appliedRoles = [...desired]
  // Already correct? No PATCH needed — that's a success.
  const changed =
    member.roles.filter(r => NC_MANAGED_ROLES.has(r)).sort().join() !== [...desired].sort().join()
  if (!changed) return { ok: true, status: 'synced', appliedRoles }

  const preserved = member.roles.filter(r => !NC_MANAGED_ROLES.has(r))
  const result = await setMemberRoles(discordId, [...preserved, ...desired])
  if (result.ok) return { ok: true, status: 'synced', appliedRoles }

  console.error('[discord] setMemberRoles failed', result.status, result.error)
  // 403 = missing MANAGE_ROLES perm or NC roles sit above the bot's highest role
  return { ok: false, status: result.status === 403 ? 'forbidden' : 'error', error: `patch ${result.status}` }
}
