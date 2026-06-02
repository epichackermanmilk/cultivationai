// lib/discord.ts
// Discord role management for NovelCodex ↔ Discord server integration.
// Uses the Omega Bot token to assign/remove roles without OAuth2.

import { createClient } from '@supabase/supabase-js'

// ── Constants ──────────────────────────────────────────────────────────────────
export const DISCORD_GUILD_ID = '1511269693586018324'

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

/** Get a guild member's current roles. Returns null if not in server. */
async function getMemberRoles(discordUserId: string): Promise<string[] | null> {
  const res = await fetch(`${DISCORD_API}/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}`, {
    headers: botHeaders(),
  })
  if (res.status === 404) return null
  if (!res.ok) return null
  const member = await res.json() as { roles: string[] }
  return member.roles ?? []
}

/** Set a member's full role list (preserving non-NC roles). */
async function setMemberRoles(discordUserId: string, newRoles: string[]): Promise<boolean> {
  const res = await fetch(`${DISCORD_API}/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}`, {
    method:  'PATCH',
    headers: botHeaders(),
    body:    JSON.stringify({ roles: newRoles }),
  })
  return res.ok
}

// ── Main sync function ─────────────────────────────────────────────────────────

/**
 * Compute the correct NC roles for a user and apply them to Discord.
 * Safe to call on every purchase / subscription change.
 * No-ops silently if user has no linked Discord or isn't in the server.
 */
export async function syncDiscordRoles(supabaseUserId: string): Promise<void> {
  if (!process.env.DISCORD_BOT_TOKEN) return

  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: profile } = await sb
    .from('profiles')
    .select('discord_user_id, discord_verified, tokens_ever_purchased, subscription_active, subscription_tier')
    .eq('id', supabaseUserId)
    .maybeSingle()

  if (!profile?.discord_user_id || !profile.discord_verified) return

  const discordId  = profile.discord_user_id
  const tokensEver = (profile.tokens_ever_purchased as number) ?? 0
  const subActive  = !!profile.subscription_active
  // The Stripe webhook stores the tier lowercased ('scholar' / 'reader'), so
  // compare case-insensitively here — otherwise Scholar subs never get the role.
  const subTier    = ((profile.subscription_tier as string | null) ?? '').toLowerCase()

  // ── Determine desired NC roles ────────────────────────────────────────────────
  const desired = new Set<string>()

  // Base member role — always present once linked
  desired.add(DISCORD_ROLES.NovelCodex)

  // Subscription roles (mutually upgrade — Scholar gets both)
  if (subActive && subTier === 'scholar') {
    desired.add(DISCORD_ROLES.Scholar)
    desired.add(DISCORD_ROLES.Reader)  // Scholar is a superset
  } else if (subActive) {
    desired.add(DISCORD_ROLES.Reader)
  }

  // Spend tiers (cumulative — higher tier includes lower)
  if (tokensEver >= 20000) {
    desired.add(DISCORD_ROLES.ImmortalSage)
    desired.add(DISCORD_ROLES.Sage)
    desired.add(DISCORD_ROLES.Seeker)
  } else if (tokensEver >= 3500) {
    desired.add(DISCORD_ROLES.Sage)
    desired.add(DISCORD_ROLES.Seeker)
  } else if (tokensEver >= 550) {
    desired.add(DISCORD_ROLES.Seeker)
  }

  // ── Get current roles and compute diff ───────────────────────────────────────
  const currentRoles = await getMemberRoles(discordId)
  if (currentRoles === null) return  // not in server — skip silently

  // Keep all non-NC roles (e.g. Omega Bot cultivation roles)
  const preserved = currentRoles.filter(r => !NC_MANAGED_ROLES.has(r))
  const newRoles   = [...preserved, ...desired]

  // Only PATCH if something actually changed
  const changed =
    currentRoles.filter(r => NC_MANAGED_ROLES.has(r)).sort().join() !==
    [...desired].sort().join()

  if (changed) {
    await setMemberRoles(discordId, newRoles)
  }
}
