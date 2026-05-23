import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabase } from '@/lib/supabase'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!

export async function GET() {
  const token = (await cookies()).get('nc_session')?.value
  if (!token) return NextResponse.json({ user: null })

  // Validate the token with Supabase
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
  })
  if (!r.ok) return NextResponse.json({ user: null })
  const userData = await r.json()

  // Pull token balance from profiles table
  const sb = getSupabase()
  const { data: profile } = await sb
    .from('profiles')
    .select('tokens')
    .eq('id', userData.id)
    .maybeSingle()

  return NextResponse.json({
    user: {
      id:     userData.id,
      email:  userData.email,
      tokens: profile?.tokens ?? 0,
    },
  })
}
