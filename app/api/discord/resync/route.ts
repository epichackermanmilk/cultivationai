// POST /api/discord/resync
// Re-applies the caller's Discord roles based on their CURRENT profile state
// (tokens_ever_purchased, subscription_active, subscription_tier).
//
// Roles are normally pushed to Discord only by the Stripe webhook or the
// Discord link/verify flow. This endpoint lets a signed-in user (or QA) force a
// resync after their profile changes — e.g. after editing perk fields directly
// in Supabase to test ad-free / subscription / spend-tier roles without paying.
//
// It returns a readout of the gating fields and the role names the rules imply,
// so you can verify the result against what actually lands in Discord.

import { NextResponse } from 'next/server'
import { cookies }      from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { syncDiscordRoles } from '@/lib/discord'

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Mirrors the thresholds in lib/discord.ts — informational readout only.
function impliedRoles(tokensEver: number, subActive: boolean, subTier: string): string[] {
  const roles = ['NovelCodex']
  if (subActive && subTier === 'scholar') roles.push('Scholar', 'Reader')
  else if (subActive)                     roles.push('Reader')
  if (tokensEver >= 20000)      roles.push('Immortal Sage', 'Sage', 'Seeker')
  else if (tokensEver >= 3500)  roles.push('Sage', 'Seeker')
  else if (tokensEver >= 550)   roles.push('Seeker')
  return roles
}

export async function POST() {
  const cookieStore = await cookies()
  const token = cookieStore.get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  const { data: profile } = await sb
    .from('profiles')
    .select('discord_user_id, discord_verified, tokens_ever_purchased, subscription_active, subscription_tier')
    .eq('id', user.id)
    .maybeSingle()

  const linked   = !!profile?.discord_user_id
  const verified = !!profile?.discord_verified

  if (!linked || !verified) {
    return NextResponse.json({
      ok: false,
      linked, verified,
      message: 'No verified Discord account is linked — link your Discord on the Profile page first, then resync.',
    }, { status: 409 })
  }

  const tokensEver = (profile!.tokens_ever_purchased as number) ?? 0
  const subActive  = !!profile!.subscription_active
  const subTier    = ((profile!.subscription_tier as string | null) ?? '').toLowerCase()

  // Apply the roles to Discord based on current profile state.
  try {
    await syncDiscordRoles(user.id)
  } catch (e) {
    return NextResponse.json({ ok: false, error: `Sync failed: ${String(e)}` }, { status: 502 })
  }

  return NextResponse.json({
    ok: true,
    profile: { tokensEver, subActive, subTier: subTier || null },
    appliedRoles: impliedRoles(tokensEver, subActive, subTier),
    message: 'Roles resynced. Check your roles in the Discord server to confirm.',
  })
}
