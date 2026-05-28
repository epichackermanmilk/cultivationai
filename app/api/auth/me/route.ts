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
  // created_at falls back to auth.users.created_at (always present)
  let created_at: string = user.created_at ?? new Date().toISOString()
  try {
    const { data: profile } = await sb
      .from('profiles')
      .select('tokens, username, onboarding_bonus_claimed, created_at')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.tokens !== undefined) tokens = profile.tokens
    if (profile?.username !== undefined) username = profile.username ?? null
    if (profile?.onboarding_bonus_claimed !== undefined) {
      onboarding_bonus_claimed = profile.onboarding_bonus_claimed
    }
    if (profile?.created_at) created_at = profile.created_at
  } catch { /* profiles table optional */ }

  return NextResponse.json({
    user: {
      id:                      user.id,
      email:                   user.email,
      tokens:                  tokens ?? 0,
      username,
      onboarding_bonus_claimed,
      created_at,
    },
  })
}
