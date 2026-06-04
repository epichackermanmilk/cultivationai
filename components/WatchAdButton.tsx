'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { isNativeAppClient } from '@/lib/native'
import { adsAvailable, showRewardedAd } from '@/lib/admob-client'

// "Watch a quick ad → +10 tokens" — shown only inside the app (where AdMob is
// available). Free in-app way to earn the cost of one question.
export default function WatchAdButton() {
  const { user, refresh } = useAuth()
  const [ready, setReady] = useState(false)
  const [busy,  setBusy]  = useState(false)
  const [msg,   setMsg]   = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => { setReady(isNativeAppClient() && adsAvailable()) }, [])
  if (!ready || !user) return null

  async function watch() {
    setBusy(true); setMsg(null)
    try {
      const earned = await showRewardedAd()
      if (!earned) { setMsg({ ok: false, text: 'Ad closed early — watch the full ad to earn tokens.' }); return }
      const r = await fetch('/api/ads/reward', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setMsg({ ok: false, text: d.error ?? 'Could not credit tokens.' }); return }
      setMsg({ ok: true, text: `+${d.reward} tokens! ${d.rewardsLeftToday} more available today.` })
      await refresh()
    } catch (e) {
      const m = (e as Error)?.message
      setMsg({ ok: false, text: m === 'NO_BRIDGE' ? 'Ads are unavailable here.' : 'No ad ready right now — try again in a moment.' })
    } finally { setBusy(false) }
  }

  return (
    <div className="mt-4">
      <button
        onClick={watch}
        disabled={busy}
        className="w-full rounded-xl py-3 text-sm font-bold text-black transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)', boxShadow: '0 6px 20px rgba(245,158,11,0.3)' }}
      >
        {busy ? 'Loading ad…' : '🎬 Watch a quick ad — get 10 tokens'}
      </button>
      {msg && <p className={`mt-2 text-center text-xs ${msg.ok ? 'text-emerald-400' : 'text-zinc-400'}`}>{msg.text}</p>}
    </div>
  )
}
