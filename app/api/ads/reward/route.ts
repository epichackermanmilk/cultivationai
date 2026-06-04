import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { admin } from '@/lib/auth-server'
import { isNativeAppUA } from '@/lib/native'

// POST /api/ads/reward — credit tokens for watching a rewarded ad (native app only).
// Daily-capped to limit abuse. NOTE: this is a client-confirmed reward; the next
// hardening step is AdMob Server-Side Verification (SSV) — see the SSV callback.

const REWARD    = 10
const DAILY_CAP = 5   // max rewarded ads/day → up to 50 tokens/day

export async function POST(req: Request) {
  // Only the app can earn ad rewards (the watch-ad UI is app-only).
  if (!isNativeAppUA(req.headers.get('user-agent'))) {
    return NextResponse.json({ error: 'Ad rewards are only available in the app.' }, { status: 403 })
  }

  const token = (await cookies()).get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  const { data: profile } = await sb
    .from('profiles')
    .select('tokens, ad_rewards_date, ad_rewards_count')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const today      = new Date().toISOString().slice(0, 10)
  const sameDay    = profile.ad_rewards_date === today
  const countToday = sameDay ? (profile.ad_rewards_count ?? 0) : 0

  if (countToday >= DAILY_CAP) {
    return NextResponse.json(
      { error: `Daily limit reached — up to ${DAILY_CAP * REWARD} tokens/day from ads. Come back tomorrow.`, code: 'DAILY_CAP' },
      { status: 429 },
    )
  }

  const newTokens = (profile.tokens ?? 0) + REWARD
  const { error: updErr } = await sb
    .from('profiles')
    .update({ tokens: newTokens, ad_rewards_date: today, ad_rewards_count: countToday + 1 })
    .eq('id', user.id)
  if (updErr) return NextResponse.json({ error: 'Could not credit tokens. Please try again.' }, { status: 500 })

  return NextResponse.json({ tokens: newTokens, reward: REWARD, rewardsLeftToday: DAILY_CAP - (countToday + 1) })
}
