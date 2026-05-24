'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

interface ProfileData {
  username:                string | null
  age:                     number | null
  tokens:                  number
  onboarding_bonus_claimed: boolean
}

export default function ProfilePage() {
  const { user, loading, refresh } = useAuth()
  const router = useRouter()

  const [profile,  setProfile]  = useState<ProfileData | null>(null)
  const [fetching, setFetching] = useState(true)

  const [username,  setUsername]  = useState('')
  const [age,       setAge]       = useState('')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [bonusMsg,  setBonusMsg]  = useState<string | null>(null)
  const [saved,     setSaved]     = useState(false)

  const bonusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [loading, user, router])

  // Fetch profile
  useEffect(() => {
    if (!user) return
    fetch('/api/profile')
      .then(r => r.json())
      .then((d: ProfileData) => {
        setProfile(d)
        setUsername(d.username ?? '')
        setAge(d.age != null ? String(d.age) : '')
      })
      .finally(() => setFetching(false))
  }, [user])

  const bothFilled = username.trim().length >= 3 && age.trim() !== ''
  const bonusPending = profile && !profile.onboarding_bonus_claimed && bothFilled

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError(null)
    setSaved(false)
    setBonusMsg(null)
    if (bonusTimerRef.current) clearTimeout(bonusTimerRef.current)

    const body: Record<string, unknown> = {}
    const trimmed = username.trim()
    if (trimmed) body.username = trimmed
    const parsedAge = parseInt(age, 10)
    if (!isNaN(parsedAge)) body.age = parsedAge

    try {
      const r = await fetch('/api/profile', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const d = await r.json()

      if (!r.ok) {
        setError(d.error ?? 'Something went wrong')
        return
      }

      // Update local profile state
      setProfile(prev => prev ? {
        ...prev,
        username:                d.username,
        age:                     d.age,
        tokens:                  d.tokens,
        onboarding_bonus_claimed: d.bonus_awarded ? true : prev.onboarding_bonus_claimed,
      } : null)

      setSaved(true)

      if (d.bonus_awarded) {
        setBonusMsg(`+${d.bonus_tokens} tokens awarded! Thanks for completing your profile.`)
        await refresh() // sync token count in header
      }

      bonusTimerRef.current = setTimeout(() => {
        setSaved(false)
        setBonusMsg(null)
      }, 4000)
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  if (loading || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

  const bonusAlreadyClaimed = profile?.onboarding_bonus_claimed ?? false
  const hasUsername = !!profile?.username
  const hasAge      = profile?.age != null

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-1 text-2xl font-bold" style={{ color: 'var(--nc-text)' }}>
        Your Profile
      </h1>
      <p className="mb-8 text-sm" style={{ color: 'var(--nc-text2)' }}>
        {user.email}
      </p>

      {/* Onboarding reward banner */}
      {!bonusAlreadyClaimed && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <span className="text-xl">⚡</span>
          <div>
            <p className="text-sm font-semibold text-amber-400">Earn 10 free tokens</p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--nc-text2)' }}>
              Set a username and your age to unlock your welcome bonus. One-time reward.
            </p>
          </div>
          {/* Progress pills */}
          <div className="ml-auto flex flex-col gap-1 text-right">
            <span className={`text-xs font-medium ${hasUsername ? 'text-emerald-400' : 'text-zinc-500'}`}>
              {hasUsername ? '✓ Username' : '○ Username'}
            </span>
            <span className={`text-xs font-medium ${hasAge ? 'text-emerald-400' : 'text-zinc-500'}`}>
              {hasAge ? '✓ Age' : '○ Age'}
            </span>
          </div>
        </div>
      )}

      {/* Bonus / saved feedback */}
      {bonusMsg && (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-sm font-medium text-emerald-400">
          🎉 {bonusMsg}
        </div>
      )}
      {saved && !bonusMsg && (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-sm font-medium text-emerald-400">
          Profile saved
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSave}
        className="rounded-2xl border p-6 space-y-5"
        style={{ borderColor: 'var(--nc-border)', background: 'var(--nc-bg2)' }}
      >
        {/* Token balance */}
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <span className="text-sm font-medium" style={{ color: 'var(--nc-text)' }}>Token balance</span>
          <span className="text-lg font-bold text-amber-400">
            ⚡ {(profile?.tokens ?? user.tokens).toLocaleString()}
          </span>
        </div>

        {/* Username */}
        <div>
          <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--nc-text)' }}>
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="e.g. CultivatorPrime"
            minLength={3}
            maxLength={24}
            pattern="[a-zA-Z0-9_]+"
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30"
            style={{
              background:   'var(--nc-bg)',
              borderColor:  'var(--nc-border)',
              color:        'var(--nc-text)',
            }}
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--nc-text2)' }}>
            3–24 characters, letters, numbers, and underscores only
          </p>
        </div>

        {/* Age */}
        <div>
          <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--nc-text)' }}>
            Age
          </label>
          <input
            type="number"
            value={age}
            onChange={e => setAge(e.target.value)}
            placeholder="e.g. 24"
            min={13}
            max={120}
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30"
            style={{
              background:  'var(--nc-bg)',
              borderColor: 'var(--nc-border)',
              color:       'var(--nc-text)',
            }}
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--nc-text2)' }}>
            Must be 13 or older to use NovelBrain
          </p>
        </div>

        {/* Hint when bonus is about to trigger */}
        {bonusPending && (
          <p className="text-xs text-center text-amber-400 font-medium">
            ⚡ Save now to claim your 10-token welcome bonus!
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </form>

      {/* Quick links */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <a
          href="/"
          className="flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm transition hover:border-amber-500/40"
          style={{ borderColor: 'var(--nc-border)', color: 'var(--nc-text2)' }}
        >
          ← Back to library
        </a>
        <a
          href="/chat"
          className="flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm transition hover:border-amber-500/40"
          style={{ borderColor: 'var(--nc-border)', color: 'var(--nc-text2)' }}
        >
          ⚡ Start chatting
        </a>
      </div>
    </div>
  )
}
