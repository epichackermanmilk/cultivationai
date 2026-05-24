import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const ONBOARDING_BONUS = 10

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function getUser(token: string) {
  const sb = admin()
  const { data: { user }, error } = await sb.auth.getUser(token)
  if (error || !user) return null
  return user
}

// GET /api/profile — return current user's profile fields
export async function GET() {
  const token = (await cookies()).get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = admin()
  const { data: profile } = await sb
    .from('profiles')
    .select('tokens, username, age, onboarding_bonus_claimed')
    .eq('id', user.id)
    .maybeSingle()

  return NextResponse.json({
    id: user.id,
    email: user.email,
    tokens: profile?.tokens ?? 0,
    username: profile?.username ?? null,
    age: profile?.age ?? null,
    onboarding_bonus_claimed: profile?.onboarding_bonus_claimed ?? false,
  })
}

// PATCH /api/profile — update username and/or age; award onboarding bonus once
export async function PATCH(req: NextRequest) {
  const token = (await cookies()).get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { username, age } = body as { username?: string; age?: number }

  // Validate username
  if (username !== undefined) {
    if (typeof username !== 'string' || username.trim().length < 3 || username.trim().length > 24) {
      return NextResponse.json({ error: 'Username must be 3–24 characters' }, { status: 400 })
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      return NextResponse.json({ error: 'Username can only contain letters, numbers, and underscores' }, { status: 400 })
    }
  }

  // Validate age
  if (age !== undefined) {
    if (!Number.isInteger(age) || age < 13 || age > 120) {
      return NextResponse.json({ error: 'Age must be between 13 and 120' }, { status: 400 })
    }
  }

  const sb = admin()

  // Load current profile
  const { data: current } = await sb
    .from('profiles')
    .select('tokens, username, age, onboarding_bonus_claimed')
    .eq('id', user.id)
    .maybeSingle()

  const newUsername = username !== undefined ? username.trim() : current?.username
  const newAge      = age      !== undefined ? age             : current?.age

  // Check username uniqueness (only if changing)
  if (username !== undefined && username.trim().toLowerCase() !== (current?.username ?? '').toLowerCase()) {
    const { data: taken } = await sb
      .from('profiles')
      .select('id')
      .ilike('username', username.trim())
      .neq('id', user.id)
      .maybeSingle()
    if (taken) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }
  }

  // Check if we should award the onboarding bonus (first time both are set)
  const bonusAlreadyClaimed = current?.onboarding_bonus_claimed ?? false
  const bothNowSet          = !!newUsername && !!newAge
  const awardBonus          = bothNowSet && !bonusAlreadyClaimed

  const currentTokens = current?.tokens ?? 0
  const newTokens     = awardBonus ? currentTokens + ONBOARDING_BONUS : currentTokens

  const updatePayload: Record<string, unknown> = {
    username: newUsername ?? null,
    age:      newAge      ?? null,
    tokens:   newTokens,
  }
  if (awardBonus) updatePayload.onboarding_bonus_claimed = true

  const { error: updateErr } = await sb
    .from('profiles')
    .update(updatePayload)
    .eq('id', user.id)

  if (updateErr) {
    // Unique constraint violation → username taken
    if (updateErr.code === '23505') {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }

  return NextResponse.json({
    tokens:          newTokens,
    username:        newUsername ?? null,
    age:             newAge      ?? null,
    bonus_awarded:   awardBonus,
    bonus_tokens:    awardBonus ? ONBOARDING_BONUS : 0,
  })
}
