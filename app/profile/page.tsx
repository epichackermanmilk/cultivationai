'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import TokenWidget from '@/components/TokenWidget'
import Footer from '@/components/Footer'

interface ProfileData {
  username:                 string | null
  age:                      number | null
  tokens:                   number
  onboarding_bonus_claimed: boolean
  email_marketing_consent:  boolean
}

export default function ProfilePage() {
  const { user, loading, refresh } = useAuth()
  const router = useRouter()

  const [profile,  setProfile]  = useState<ProfileData | null>(null)
  const [fetching, setFetching] = useState(true)

  const [username,       setUsername]       = useState('')
  const [age,            setAge]            = useState('')
  const [emailConsent,   setEmailConsent]   = useState(false)
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [bonusMsg,       setBonusMsg]       = useState<string | null>(null)
  const [saved,          setSaved]          = useState(false)
  const [showAgeConfirm, setShowAgeConfirm] = useState(false)

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
        setEmailConsent(d.email_marketing_consent ?? false)
      })
      .finally(() => setFetching(false))
  }, [user])

  const bothFilled = username.trim().length >= 3 && age.trim() !== ''
  const bonusPending = profile && !profile.onboarding_bonus_claimed && bothFilled

  // Only enable Save if something actually changed from the loaded values
  const isDirty = profile != null && (
    username.trim() !== (profile.username ?? '') ||
    emailConsent !== profile.email_marketing_consent ||
    (profile.age == null && age.trim() !== '')  // age can only be set once
  )

  async function doSave() {
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
    body.email_marketing_consent = emailConsent

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
        username:                 d.username,
        age:                      d.age,
        tokens:                   d.tokens,
        onboarding_bonus_claimed: d.bonus_awarded ? true : prev.onboarding_bonus_claimed,
        email_marketing_consent:  d.email_marketing_consent ?? emailConsent,
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

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    // First time setting age → require confirmation (it can't be changed later)
    const isSettingAgeFresh = !hasAge && age.trim() !== ''
    if (isSettingAgeFresh) {
      setShowAgeConfirm(true)
    } else {
      doSave()
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
    <div className="min-h-screen flex flex-col pb-16 sm:pb-0" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--nc-border)] bg-[var(--nc-bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/library" className="group shrink-0 flex items-center gap-3">
            <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-amber-400 group-hover:text-amber-300 transition">NovelCodex</h1>
              <p className="hidden sm:block text-xs text-zinc-500">Every secret, every character, every world — ask anything.</p>
            </div>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/library"
              className="hidden sm:flex items-center whitespace-nowrap rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs font-medium text-amber-400/75 transition hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-400">
              ← Library
            </Link>
            <TokenWidget />
          </div>
        </div>
      </header>

    <div className="flex-1 mx-auto w-full max-w-lg px-4 py-12">

      {/* ── Age-lock confirmation dialog ─────────────────────────────────── */}
      {showAgeConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
            style={{ background: 'var(--nc-bg2)', borderColor: 'var(--nc-border)' }}>
            <h3 className="mb-2 text-base font-bold" style={{ color: 'var(--nc-text)' }}>
              Confirm your age
            </h3>
            <p className="mb-1 text-sm" style={{ color: 'var(--nc-text2)' }}>
              You're setting your age to <span className="font-semibold text-amber-400">{age}</span>.
            </p>
            <p className="mb-5 text-sm font-medium text-red-400">
              ⚠ You won't be able to change this later.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAgeConfirm(false)}
                className="flex-1 rounded-xl border py-2.5 text-sm transition hover:border-amber-500/40"
                style={{ borderColor: 'var(--nc-border)', color: 'var(--nc-text2)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowAgeConfirm(false); doSave() }}
                className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition"
              >
                Yes, confirm
              </button>
            </div>
          </div>
        </div>
      )}
      <h1 className="mb-1 text-2xl font-bold" style={{ color: 'var(--nc-text)' }}>
        Your Profile
      </h1>
      <p className="mb-8 text-sm" style={{ color: 'var(--nc-text2)' }}>
        {user.email}
      </p>

      {/* Onboarding reward banner */}
      {!bonusAlreadyClaimed && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base leading-none">⚡</span>
            <p className="text-sm font-semibold text-amber-400">Earn 10 free tokens</p>
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--nc-text2)' }}>
            Set a username and your age to unlock your welcome bonus. One-time reward.
          </p>
          {/* Progress pills — horizontal row below the text */}
          <div className="flex gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              hasUsername
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-zinc-600 bg-zinc-800/50 text-zinc-500'
            }`}>
              {hasUsername ? '✓' : '○'} Username
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              hasAge
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-zinc-600 bg-zinc-800/50 text-zinc-500'
            }`}>
              {hasAge ? '✓' : '○'} Age
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
        {/* Token balance → links to shop */}
        <Link
          href="/shop"
          className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 transition hover:bg-amber-500/20"
        >
          <span className="text-sm font-medium" style={{ color: 'var(--nc-text)' }}>Token balance</span>
          <span className="flex items-center gap-1.5 text-lg font-bold text-amber-400">
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            {(profile?.tokens ?? user.tokens).toLocaleString()}
          </span>
        </Link>

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
            onChange={e => !hasAge && setAge(e.target.value)}
            readOnly={hasAge}
            placeholder="e.g. 24"
            min={13}
            max={120}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition ${
              hasAge ? 'cursor-not-allowed opacity-60' : 'focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30'
            }`}
            style={{
              background:  'var(--nc-bg)',
              borderColor: 'var(--nc-border)',
              color:       'var(--nc-text)',
            }}
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--nc-text2)' }}>
            {hasAge ? '🔒 Age cannot be changed after it\'s set.' : 'Must be 13 or older to use NovelCodex'}
          </p>
        </div>

        {/* Email notifications toggle */}
        <div className="flex items-start justify-between gap-3 rounded-xl border px-4 py-3"
          style={{ borderColor: 'var(--nc-border)' }}>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--nc-text)' }}>Email notifications</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--nc-text2)' }}>
              New features, novel updates &amp; announcements.{' '}
              <a href="/unsubscribe" className="text-amber-400 hover:underline">Unsubscribe</a>
            </p>
          </div>
          {/* Toggle switch */}
          <button
            type="button"
            onClick={() => setEmailConsent(v => !v)}
            aria-pressed={emailConsent}
            className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${
              emailConsent ? 'bg-amber-500' : 'bg-zinc-700'
            }`}
          >
            <span
              className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
              style={{ left: '2px', transform: emailConsent ? 'translateX(16px)' : 'translateX(0)' }}
            />
          </button>
        </div>

        {/* Hint when bonus is about to trigger */}
        {bonusPending && (
          <p className="text-xs text-center text-amber-400 font-medium">
            ⚡ Save now to claim your 10-token welcome bonus!
          </p>
        )}

        <button
          type="submit"
          disabled={saving || !isDirty}
          className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </form>

      {/* Quick links */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <a
          href="/library"
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

      <Footer />
    </div>
  )
}
