import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET() {
  const token = (await cookies()).get('nc_session')?.value
  if (!token) return NextResponse.json({ user: null })

  const sb = admin()
  const { data: { user }, error } = await sb.auth.getUser(token)
  if (error || !user) return NextResponse.json({ user: null })

  // Prefer profiles table; fall back to user_metadata
  let tokens   = user.user_metadata?.tokens as number | undefined
  let username: string | null = null
  let onboarding_bonus_claimed = false
  let ads_disabled          = false
  let subscription_active   = false
  let discord_user_id: string | null = null
  let discord_verified      = false
  let tokens_ever_purchased = 0
  // created_at falls back to auth.users.created_at (always present)
  let created_at: string = user.created_at ?? new Date().toISOString()
  try {
    const { data: profile } = await sb
      .from('profiles')
      .select('tokens, username, onboarding_bonus_claimed, created_at, ads_disabled, subscription_active, discord_user_id, discord_verified, tokens_ever_purchased')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.tokens !== undefined) tokens = profile.tokens
    if (profile?.username !== undefined) username = profile.username ?? null
    if (profile?.onboarding_bonus_claimed !== undefined) {
      onboarding_bonus_claimed = profile.onboarding_bonus_claimed
    }
    if (profile?.created_at)          created_at = profile.created_at
    if (profile?.ads_disabled)        ads_disabled = !!profile.ads_disabled
    if (profile?.subscription_active) subscription_active = !!profile.subscription_active
    discord_user_id      = profile?.discord_user_id ?? null
    discord_verified     = !!profile?.discord_verified
    tokens_ever_purchased = (profile?.tokens_ever_purchased as number) ?? 0
  } catch { /* profiles table optional */ }

  // Whether the account has an email/password identity (vs. Google-only). Lets
  // the UI show password/email management only where it applies.
  const has_password = (user.identities ?? []).some(i => i.provider === 'email')

  const avatar_url = (user.user_metadata?.avatar_url as string | null | undefined) ?? null

  return NextResponse.json({
    user: {
      id:                      user.id,
      email:                   user.email,
      tokens:                  tokens ?? 0,
      username,
      avatar_url,
      onboarding_bonus_claimed,
      created_at,
      ads_disabled,
      subscription_active,
      discord_user_id,
      discord_verified,
      tokens_ever_purchased,
      has_password,
    },
  })
}
