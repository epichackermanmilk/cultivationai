'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import SiteHeader from '@/components/SiteHeader'
import Footer from '@/components/Footer'
import { track } from '@/lib/analytics'
import AccountSecurity from '@/components/AccountSecurity'

const DISCORD_INVITE = 'https://discord.gg/xjQvnrvW3M'

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

  // Discord link state
  const [discordId,       setDiscordId]       = useState('')
  const [discordCode,     setDiscordCode]      = useState('')
  const [discordStep,     setDiscordStep]      = useState<'idle' | 'sent' | 'verified'>('idle')
  const [discordLoading,  setDiscordLoading]   = useState(false)
  const [discordError,    setDiscordError]     = useState<string | null>(null)
  const [discordVerified, setDiscordVerified]  = useState(false)

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
      .then(() => {
        // Init discord state from auth user
        if (user?.discord_verified) {
          setDiscordVerified(true)
          setDiscordStep('verified')
          setDiscordId(user.discord_user_id ?? '')
        }
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

  async function sendDiscordCode() {
    if (!discordId.trim() || discordLoading) return
    setDiscordLoading(true)
    setDiscordError(null)
    try {
      const r = await fetch('/api/discord/link/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordUserId: discordId.trim() }),
      })
      const d = await r.json()
      if (!r.ok) { setDiscordError(d.error ?? 'Failed to send code'); return }
      setDiscordStep('sent')
    } catch {
      setDiscordError('Network error — try again')
    } finally {
      setDiscordLoading(false)
    }
  }

  async function verifyDiscordCode() {
    if (!discordCode.trim() || discordLoading) return
    setDiscordLoading(true)
    setDiscordError(null)
    try {
      const r = await fetch('/api/discord/link/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: discordCode.trim() }),
      })
      const d = await r.json()
      if (!r.ok) { setDiscordError(d.error ?? 'Verification failed'); return }
      setDiscordVerified(true)
      setDiscordStep('verified')
    } catch {
      setDiscordError('Network error — try again')
    } finally {
      setDiscordLoading(false)
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
      <SiteHeader />

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

      {/* ── Discord Linking ─────────────────────────────────────────────── */}
      <div className="mt-8 rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--nc-border)' }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--nc-border)', background: 'var(--nc-bg2)' }}>
          <svg className="h-5 w-5 text-indigo-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--nc-text)' }}>Discord Account</p>
            <p className="text-xs" style={{ color: 'var(--nc-text2)' }}>
              Link your Discord to get server roles based on your activity
            </p>
          </div>
        </div>

        <div className="p-5">
          {/* Always-visible invite to the Discord server */}
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('discord_join_click', { location: 'profile' })}
            className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
            </svg>
            Join the NovelCodex Discord →
          </a>
          {discordStep === 'verified' ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
              <span className="text-emerald-400 text-lg">✓</span>
              <div>
                <p className="text-sm font-semibold text-emerald-400">Discord linked</p>
                <p className="text-xs text-zinc-400">Your roles will update automatically with purchases &amp; subscriptions.</p>
              </div>
            </div>
          ) : discordStep === 'sent' ? (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: 'var(--nc-text2)' }}>
                A 6-digit code was sent to your Discord DM. Enter it below.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={discordCode}
                  onChange={e => setDiscordCode(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && verifyDiscordCode()}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition"
                  style={{ background: 'var(--nc-bg)', borderColor: 'var(--nc-border)', color: 'var(--nc-text)' }}
                />
                <button
                  onClick={verifyDiscordCode}
                  disabled={discordCode.length !== 6 || discordLoading}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {discordLoading ? '…' : 'Verify'}
                </button>
              </div>
              <button
                onClick={() => { setDiscordStep('idle'); setDiscordCode(''); setDiscordError(null) }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition"
              >
                ← Back
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--nc-text2)' }}>
                  Your Discord User ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 123456789012345678"
                    value={discordId}
                    onChange={e => setDiscordId(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && sendDiscordCode()}
                    className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition"
                    style={{ background: 'var(--nc-bg)', borderColor: 'var(--nc-border)', color: 'var(--nc-text)' }}
                  />
                  <button
                    onClick={sendDiscordCode}
                    disabled={discordId.length < 17 || discordLoading}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition whitespace-nowrap"
                  >
                    {discordLoading ? '…' : 'Send Code'}
                  </button>
                </div>
                <p className="mt-1.5 text-xs" style={{ color: 'var(--nc-text2)' }}>
                  In Discord: Settings → Advanced → enable Developer Mode, then right-click your name → Copy User ID.
                </p>
              </div>
              <div className="rounded-lg border border-dashed px-3 py-2 text-xs" style={{ borderColor: 'var(--nc-border)', color: 'var(--nc-text2)' }}>
                🎖️ Roles you can earn in the <strong style={{ color: 'var(--nc-text)' }}>Eternal River Sect</strong> Discord:
                <span className="ml-1 text-indigo-400">NovelCodex Member</span> ·
                <span className="ml-1 text-violet-400">Reader / Scholar</span> ·
                <span className="ml-1 text-amber-400">Seeker → Sage → Immortal Sage</span>
              </div>
            </div>
          )}

          {discordError && (
            <p className="mt-3 text-xs text-rose-400">{discordError}</p>
          )}
        </div>
      </div>

      {/* Account & security */}
      <AccountSecurity />

      {/* Quick links */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <a
          href="/library"
          className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-black transition hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0"
          style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)' }}
        >
          Library
        </a>
        <a
          href="/chat"
          className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-black transition hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0"
          style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)' }}
        >
          Start Chatting
        </a>
      </div>
    </div>

      <Footer />
    </div>
  )
}
