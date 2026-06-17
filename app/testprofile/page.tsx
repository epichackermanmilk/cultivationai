'use client'

// /testprofile — account hub, redesigned to the /test* standard. Reuses the real
// backend (/api/profile GET+PATCH, /api/discord/link/*) and auth context. Profile
// header + stat cards, edit form with the one-time onboarding bonus, Discord linking,
// and sign-out. Signed-out users go to /testlogin?return=/testprofile.

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import TestHeader from '@/components/TestHeader'
import { TestStyles } from '@/components/TestUI'
import { track } from '@/lib/analytics'

const DISCORD_INVITE = 'https://discord.gg/xjQvnrvW3M'

interface ProfileData {
  username: string | null; age: number | null; tokens: number
  onboarding_bonus_claimed: boolean; email_marketing_consent: boolean
}

export default function TestProfilePage() {
  const { user, loading, refresh, logout } = useAuth()
  const router = useRouter()

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [fetching, setFetching] = useState(true)
  const [username, setUsername] = useState('')
  const [age, setAge] = useState('')
  const [emailConsent, setEmailConsent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bonusMsg, setBonusMsg] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [showAgeConfirm, setShowAgeConfirm] = useState(false)

  const [discordId, setDiscordId] = useState('')
  const [discordCode, setDiscordCode] = useState('')
  const [discordStep, setDiscordStep] = useState<'idle' | 'sent' | 'verified'>('idle')
  const [discordLoading, setDiscordLoading] = useState(false)
  const [discordError, setDiscordError] = useState<string | null>(null)
  const bonusTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Avatar upload ────────────────────────────────────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarErr, setAvatarErr] = useState<string | null>(null)

  async function uploadAvatar(file: File) {
    setAvatarErr(null); setAvatarBusy(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const r = await fetch('/api/profile/avatar', { method: 'POST', body: fd })
      const d = await r.json()
      if (!r.ok) { setAvatarErr(d.error || 'Upload failed'); return }
      await refresh()
    } catch { setAvatarErr('Upload failed — try again') } finally { setAvatarBusy(false) }
  }

  async function removeAvatar() {
    setAvatarErr(null); setAvatarBusy(true)
    try { await fetch('/api/profile/avatar', { method: 'DELETE' }); await refresh() }
    catch { setAvatarErr('Could not remove') } finally { setAvatarBusy(false) }
  }

  useEffect(() => { if (!loading && !user) router.replace('/testlogin?return=/testprofile') }, [loading, user, router])

  useEffect(() => {
    if (!user) return
    fetch('/api/profile').then(r => r.json()).then((d: ProfileData) => {
      setProfile(d); setUsername(d.username ?? ''); setAge(d.age != null ? String(d.age) : ''); setEmailConsent(d.email_marketing_consent ?? false)
      if (user.discord_verified) { setDiscordStep('verified'); setDiscordId(user.discord_user_id ?? '') }
    }).finally(() => setFetching(false))
  }, [user])

  const hasUsername = !!profile?.username
  const hasAge = profile?.age != null
  const bonusClaimed = profile?.onboarding_bonus_claimed ?? false
  const isDirty = profile != null && (
    username.trim() !== (profile.username ?? '') || emailConsent !== profile.email_marketing_consent || (profile.age == null && age.trim() !== '')
  )

  async function doSave() {
    if (!user) return
    setSaving(true); setError(null); setSaved(false); setBonusMsg(null)
    if (bonusTimer.current) clearTimeout(bonusTimer.current)
    const body: Record<string, unknown> = {}
    const t = username.trim(); if (t) body.username = t
    const a = parseInt(age, 10); if (!isNaN(a)) body.age = a
    body.email_marketing_consent = emailConsent
    try {
      const r = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json()
      if (!r.ok) { setError(d.error ?? 'Something went wrong'); return }
      setProfile(prev => prev ? { ...prev, username: d.username, age: d.age, tokens: d.tokens, onboarding_bonus_claimed: d.bonus_awarded ? true : prev.onboarding_bonus_claimed, email_marketing_consent: d.email_marketing_consent ?? emailConsent } : null)
      setSaved(true)
      if (d.bonus_awarded) { setBonusMsg(`+${d.bonus_tokens} tokens awarded! Thanks for completing your profile.`); await refresh() }
      bonusTimer.current = setTimeout(() => { setSaved(false); setBonusMsg(null) }, 4000)
    } catch { setError('Network error — please try again') } finally { setSaving(false) }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault(); if (!user) return
    if (!hasAge && age.trim() !== '') setShowAgeConfirm(true); else doSave()
  }

  async function sendDiscordCode() {
    if (!discordId.trim() || discordLoading) return
    setDiscordLoading(true); setDiscordError(null)
    try {
      const r = await fetch('/api/discord/link/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ discordUserId: discordId.trim() }) })
      const d = await r.json(); if (!r.ok) { setDiscordError(d.error ?? 'Failed to send code'); return }
      setDiscordStep('sent')
    } catch { setDiscordError('Network error — try again') } finally { setDiscordLoading(false) }
  }
  async function verifyDiscordCode() {
    if (!discordCode.trim() || discordLoading) return
    setDiscordLoading(true); setDiscordError(null)
    try {
      const r = await fetch('/api/discord/link/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: discordCode.trim() }) })
      const d = await r.json(); if (!r.ok) { setDiscordError(d.error ?? 'Verification failed'); return }
      setDiscordStep('verified'); setDiscordError(d.roleSynced === false && d.message ? d.message : null)
    } catch { setDiscordError('Network error — try again') } finally { setDiscordLoading(false) }
  }

  async function signOut() { await logout(); router.replace('/testnewlibrary') }

  const input = 'w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-white/35 outline-none transition focus:border-[rgba(var(--v),0.6)]'

  if (loading || fetching) {
    return <div className="flex min-h-screen items-center justify-center" style={{ background: '#07060d' }}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[rgb(124,58,237)] border-t-transparent" />
    </div>
  }
  if (!user) return null

  const initial = (user.username || user.email || '?')[0]?.toUpperCase()
  const memberSince = user.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : null

  return (
    <div className="tnl-root relative min-h-screen text-white" style={{ ['--v' as string]: '124,58,237' }}>
      <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: '#07060d' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(85% 50% at 50% -10%, rgba(var(--v),0.24) 0%, transparent 55%)' }} />
      </div>

      <TestHeader />

      {/* Age-lock confirm */}
      {showAgeConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
          <div className="tnl-panel w-full max-w-sm p-6">
            <h3 className="mb-2 text-base font-bold">Confirm your age</h3>
            <p className="mb-1 text-sm text-white/65">You&apos;re setting your age to <span className="font-semibold" style={{ color: 'rgb(var(--v))' }}>{age}</span>.</p>
            <p className="mb-5 text-sm font-medium text-red-400">⚠ You won&apos;t be able to change this later.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowAgeConfirm(false)} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-white/70 transition hover:text-white">Cancel</button>
              <button onClick={() => { setShowAgeConfirm(false); doSave() }} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:brightness-110" style={{ background: 'rgb(var(--v))' }}>Yes, confirm</button>
            </div>
          </div>
        </div>
      )}

      <main className="relative z-10 mx-auto max-w-2xl px-4 pb-24 pt-8 sm:px-6">
        {/* Header card */}
        <div className="tnl-panel mb-5 flex items-center gap-4 p-5">
          <div className="shrink-0">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = '' }} />
            <button onClick={() => fileRef.current?.click()} disabled={avatarBusy} title="Change profile picture"
              className="group relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl text-2xl font-black ring-1 ring-white/15 transition hover:ring-[rgba(var(--v),0.7)]"
              style={{ background: 'rgba(var(--v),0.85)', boxShadow: '0 0 30px rgba(var(--v),0.45)' }}>
              {user.avatar_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                : <span>{initial}</span>}
              <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-[10px] font-semibold uppercase tracking-wide opacity-0 transition group-hover:opacity-100">
                {avatarBusy ? '' : 'Change'}
              </span>
              {avatarBusy && <span className="absolute inset-0 flex items-center justify-center bg-black/55"><span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /></span>}
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-black tracking-tight">{user.username || 'Set your username'}</h1>
            <p className="truncate text-sm text-white/50">{user.email}</p>
            {memberSince && <p className="mt-0.5 text-xs text-white/35">Member since {memberSince}</p>}
            <div className="mt-1.5 flex items-center gap-3">
              <button onClick={() => fileRef.current?.click()} disabled={avatarBusy} className="text-xs font-semibold transition hover:brightness-110 disabled:opacity-50" style={{ color: 'rgb(var(--v))' }}>
                {user.avatar_url ? 'Change picture' : 'Add a picture'}
              </button>
              {user.avatar_url && <button onClick={removeAvatar} disabled={avatarBusy} className="text-xs text-white/40 transition hover:text-red-400 disabled:opacity-50">Remove</button>}
              {avatarErr && <span className="text-xs text-red-400">{avatarErr}</span>}
            </div>
          </div>
          <button onClick={signOut} className="shrink-0 self-start rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-semibold text-white/75 transition hover:border-red-500/50 hover:text-white">Sign out</button>
        </div>

        {/* Stat cards */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          <Link href="/shop" className="tnl-panel p-4 transition hover:brightness-110">
            <p className="text-[11px] uppercase tracking-wider text-white/40">Tokens</p>
            <p className="mt-1 flex items-center gap-1 text-xl font-black" style={{ color: 'rgb(var(--v))' }}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
              {(profile?.tokens ?? user.tokens).toLocaleString()}
            </p>
            <p className="mt-0.5 text-[11px] text-white/40">Tap to top up →</p>
          </Link>
          <div className="tnl-panel p-4">
            <p className="text-[11px] uppercase tracking-wider text-white/40">Plan</p>
            <p className="mt-1 text-xl font-black">{user.subscription_active ? 'Premium' : 'Free'}</p>
            <p className="mt-0.5 text-[11px] text-white/40">{user.ads_disabled ? 'Ad-free' : 'Ads on'}</p>
          </div>
          <div className="tnl-panel p-4">
            <p className="text-[11px] uppercase tracking-wider text-white/40">Discord</p>
            <p className="mt-1 text-xl font-black">{discordStep === 'verified' ? 'Linked' : 'Not linked'}</p>
            <p className="mt-0.5 text-[11px] text-white/40">{discordStep === 'verified' ? 'Roles auto-sync' : 'Earn server roles'}</p>
          </div>
        </div>

        {/* Onboarding bonus */}
        {!bonusClaimed && (
          <div className="mb-5 rounded-2xl border border-[rgba(var(--v),0.3)] bg-[rgba(var(--v),0.08)] p-4">
            <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'rgb(var(--v))' }}><span>⚡</span> Earn 10 free tokens</p>
            <p className="mt-1 text-xs text-white/55">Set a username and your age to unlock your one-time welcome bonus.</p>
            <div className="mt-2.5 flex gap-2">
              {[['Username', hasUsername], ['Age', hasAge]].map(([l, ok]) => (
                <span key={l as string} className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${ok ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-white/15 text-white/45'}`}>{ok ? '✓' : '○'} {l}</span>
              ))}
            </div>
          </div>
        )}

        {bonusMsg && <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-sm font-medium text-emerald-400">🎉 {bonusMsg}</div>}
        {saved && !bonusMsg && <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-sm font-medium text-emerald-400">Profile saved</div>}
        {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-400">{error}</div>}

        {/* Edit form */}
        <form onSubmit={handleSave} className="tnl-panel mb-5 space-y-5 p-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. CultivatorPrime" minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]+" className={input} />
            <p className="mt-1 text-xs text-white/40">3–24 characters · letters, numbers, underscores</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Age</label>
            <input type="number" value={age} onChange={e => !hasAge && setAge(e.target.value)} readOnly={hasAge} placeholder="e.g. 24" min={13} max={120}
              className={`${input} ${hasAge ? 'cursor-not-allowed opacity-60' : ''}`} />
            <p className="mt-1 text-xs text-white/40">{hasAge ? '🔒 Age cannot be changed after it is set.' : 'Must be 13 or older to use NovelCodex'}</p>
          </div>
          <div className="flex items-start justify-between gap-3 rounded-xl border border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Email notifications</p>
              <p className="mt-0.5 text-xs text-white/50">New features, novel updates &amp; announcements. <a href="/unsubscribe" className="hover:underline" style={{ color: 'rgb(var(--v))' }}>Unsubscribe</a></p>
            </div>
            <button type="button" onClick={() => setEmailConsent(v => !v)} aria-pressed={emailConsent}
              className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors"
              style={emailConsent ? { borderColor: 'rgb(var(--v))', background: 'rgb(var(--v))' } : { borderColor: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)' }}>
              <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${emailConsent ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          <button type="submit" disabled={saving || !isDirty} className="w-full rounded-xl py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-40" style={{ background: 'rgb(var(--v))' }}>
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </form>

        {/* Discord */}
        <div className="tnl-panel mb-5 overflow-hidden">
          <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
            <svg className="h-5 w-5 shrink-0 text-indigo-400" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" /></svg>
            <div>
              <p className="text-sm font-semibold">Discord Account</p>
              <p className="text-xs text-white/50">Link your Discord to earn server roles from your activity</p>
            </div>
          </div>
          <div className="p-5">
            <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" onClick={() => track('discord_join_click', { location: 'testprofile' })}
              className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500">Join the NovelCodex Discord →</a>
            {discordStep === 'verified' ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                <span className="text-lg text-emerald-400">✓</span>
                <div><p className="text-sm font-semibold text-emerald-400">Discord linked</p><p className="text-xs text-white/50">Roles update automatically with purchases &amp; subscriptions.</p></div>
              </div>
            ) : discordStep === 'sent' ? (
              <div className="space-y-3">
                <p className="text-xs text-white/55">A 6-digit code was sent to your Discord DM. Enter it below.</p>
                <div className="flex gap-2">
                  <input inputMode="numeric" maxLength={6} placeholder="123456" value={discordCode} onChange={e => setDiscordCode(e.target.value.replace(/\D/g, ''))} onKeyDown={e => e.key === 'Enter' && verifyDiscordCode()} className={input} />
                  <button onClick={verifyDiscordCode} disabled={discordCode.length !== 6 || discordLoading} className="rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-40">{discordLoading ? '…' : 'Verify'}</button>
                </div>
                <button onClick={() => { setDiscordStep('idle'); setDiscordCode(''); setDiscordError(null) }} className="text-xs text-white/45 transition hover:text-white">← Back</button>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-white/55">Your Discord User ID</label>
                <div className="flex gap-2">
                  <input inputMode="numeric" placeholder="e.g. 123456789012345678" value={discordId} onChange={e => setDiscordId(e.target.value.replace(/\D/g, ''))} onKeyDown={e => e.key === 'Enter' && sendDiscordCode()} className={input} />
                  <button onClick={sendDiscordCode} disabled={discordId.length < 17 || discordLoading} className="whitespace-nowrap rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-40">{discordLoading ? '…' : 'Send Code'}</button>
                </div>
                <p className="text-xs text-white/40">Discord → Settings → Advanced → Developer Mode, then right-click your name → Copy User ID.</p>
              </div>
            )}
            {discordError && <p className="mt-3 text-xs text-rose-400">{discordError}</p>}
          </div>
        </div>

        {/* Account actions */}
        <div className="flex flex-wrap gap-3">
          <Link href="/delete-account" className="text-xs text-white/40 transition hover:text-red-400">Delete account</Link>
          <Link href="/forgot-password" className="text-xs text-white/40 transition hover:text-white">Reset password</Link>
        </div>
      </main>

      <TestStyles />
    </div>
  )
}
