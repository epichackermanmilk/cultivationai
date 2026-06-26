'use client'

// /profile — account hub, redesigned to the /test* standard. Reuses the real
// backend (/api/profile GET+PATCH) and auth context. Profile header + stat cards,
// edit form with the one-time onboarding bonus, and sign-out. Signed-out users go
// to /login?return=/profile.

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import TestHeader from '@/components/TestHeader'
import { TestStyles } from '@/components/TestUI'
import TestFooter from '@/components/TestFooter'
import { track } from '@/lib/analytics'

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
  const bonusTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Avatar upload ────────────────────────────────────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarErr, setAvatarErr] = useState<string | null>(null)

  // Downscale + center-crop to a square 512px JPEG in the browser, so the upload is
  // tiny (no proxy/body-size failures) and auto-fits any photo. Falls back to the raw
  // file if the browser can't decode it (e.g. some HEIC), letting the server respond.
  async function downscaleImage(file: File, size = 512): Promise<Blob> {
    const url = URL.createObjectURL(file)
    try {
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('decode')); im.src = url
      })
      const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size
      const ctx = canvas.getContext('2d')!
      const scale = Math.max(size / img.width, size / img.height)
      const w = img.width * scale, h = img.height * scale
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
      return await new Promise<Blob>((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('encode')), 'image/jpeg', 0.9))
    } finally { URL.revokeObjectURL(url) }
  }

  async function uploadAvatar(file: File) {
    setAvatarErr(null); setAvatarBusy(true)
    try {
      let upload: File = file
      try {
        const blob = await downscaleImage(file)
        upload = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
      } catch { /* couldn't decode client-side — send raw, server will process or explain */ }
      const fd = new FormData(); fd.append('file', upload)
      const r = await fetch('/api/profile/avatar', { method: 'POST', body: fd })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setAvatarErr((d as { error?: string }).error || 'Upload failed — try a JPG or PNG'); return }
      track('avatar_upload', {})
      await refresh()
    } catch { setAvatarErr('Upload failed — try again') } finally { setAvatarBusy(false) }
  }

  async function removeAvatar() {
    setAvatarErr(null); setAvatarBusy(true)
    try { await fetch('/api/profile/avatar', { method: 'DELETE' }); await refresh() }
    catch { setAvatarErr('Could not remove') } finally { setAvatarBusy(false) }
  }

  useEffect(() => { if (!loading && !user) router.replace('/login?return=/profile') }, [loading, user, router])

  useEffect(() => {
    if (!user) return
    fetch('/api/profile').then(r => r.json()).then((d: ProfileData) => {
      setProfile(d); setUsername(d.username ?? ''); setAge(d.age != null ? String(d.age) : ''); setEmailConsent(d.email_marketing_consent ?? false)
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

  async function signOut() { await logout(); router.replace('/') }

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
    <div className="tnl-root relative flex min-h-screen flex-col text-white" style={{ ['--v' as string]: '124,58,237' }}>
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

      <main className="relative z-10 mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-8 sm:px-6">
        {/* Header card */}
        <div className="tnl-panel mb-5 flex items-center gap-4 p-5">
          <div className="shrink-0">
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
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
        <div className="mb-5 grid grid-cols-2 gap-3">
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

        {/* Account actions */}
        <div className="flex flex-wrap gap-3">
          <Link href="/delete-account" className="text-xs text-white/40 transition hover:text-red-400">Delete account</Link>
          <Link href="/forgot-password" className="text-xs text-white/40 transition hover:text-white">Reset password</Link>
        </div>
      </main>

      <TestFooter />
      <TestStyles />
    </div>
  )
}
