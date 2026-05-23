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
  let tokens = user.user_metadata?.tokens as number | undefined
  try {
    const { data: profile } = await sb
      .from('profiles')
      .select('tokens')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.tokens !== undefined) tokens = profile.tokens
  } catch { /* profiles table optional */ }

  return NextResponse.json({
    user: { id: user.id, email: user.email, tokens: tokens ?? 0 },
  })
}
