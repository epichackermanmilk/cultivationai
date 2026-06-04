'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { passwordError } from '@/lib/password'

type Panel = 'password' | 'email' | 'delete' | null
type Msg = { ok: boolean; text: string } | null

const inputCls =
  'w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30'
const inputStyle = { background: 'var(--nc-bg)', borderColor: 'var(--nc-border)', color: 'var(--nc-text)' } as const

export default function AccountSecurity() {
  const { user, refresh, logout } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState<Panel>(null)

  // change password
  const [curPw,  setCurPw]  = useState('')
  const [newPw,  setNewPw]  = useState('')
  const [newPw2, setNewPw2] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwMsg,  setPwMsg]  = useState<Msg>(null)

  // change email
  const [newEmail,  setNewEmail]  = useState('')
  const [emailPw,   setEmailPw]   = useState('')
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailMsg,  setEmailMsg]  = useState<Msg>(null)

  // delete
  const [confirmEmail, setConfirmEmail] = useState('')
  const [delBusy,      setDelBusy]      = useState(false)
  const [delErr,       setDelErr]       = useState<string | null>(null)

  if (!user) return null
  const isGoogle = !user.has_password

  function toggle(p: Panel) {
    setOpen(prev => (prev === p ? null : p))
    setPwMsg(null); setEmailMsg(null); setDelErr(null)
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    const err = passwordError(newPw)
    if (err)              { setPwMsg({ ok: false, text: err }); return }
    if (newPw !== newPw2) { setPwMsg({ ok: false, text: 'New passwords do not match' }); return }
    setPwBusy(true); setPwMsg(null)
    try {
      const r = await fetch('/api/auth/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setPwMsg({ ok: false, text: d.error ?? 'Could not change password' }); return }
      setPwMsg({ ok: true, text: 'Password updated.' })
      setCurPw(''); setNewPw(''); setNewPw2('')
    } catch { setPwMsg({ ok: false, text: 'Network error — please try again' }) }
    finally { setPwBusy(false) }
  }

  async function changeEmail(e: React.FormEvent) {
    e.preventDefault()
    const t = newEmail.trim()
    if (!/\S+@\S+\.\S+/.test(t)) { setEmailMsg({ ok: false, text: 'Enter a valid email address' }); return }
    setEmailBusy(true); setEmailMsg(null)
    try {
      const r = await fetch('/api/auth/change-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail: t, currentPassword: emailPw }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setEmailMsg({ ok: false, text: d.error ?? 'Could not change email' }); return }
      setEmailMsg({ ok: true, text: `Email changed to ${t}.` })
      setNewEmail(''); setEmailPw('')
      await refresh()
    } catch { setEmailMsg({ ok: false, text: 'Network error — please try again' }) }
    finally { setEmailBusy(false) }
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault()
    setDelBusy(true); setDelErr(null)
    try {
      const r = await fetch('/api/auth/delete-account', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmEmail: confirmEmail.trim() }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setDelErr(d.error ?? 'Could not delete account'); return }
      await logout()
      router.replace('/')
    } catch { setDelErr('Network error — please try again') }
    finally { setDelBusy(false) }
  }

  const Chevron = ({ active }: { active: boolean }) => (
    <svg className={`h-3 w-3 shrink-0 transition-transform ${active ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 10 6">
      <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  function rowBtn(label: string, panel: Panel, danger = false) {
    return (
      <button
        onClick={() => toggle(panel)}
        className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium transition hover:bg-white/[0.02]"
        style={{ color: danger ? '#f87171' : 'var(--nc-text)' }}
      >
        {label}
        <Chevron active={open === panel} />
      </button>
    )
  }

  return (
    <div className="mt-8 rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--nc-border)' }}>
      <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--nc-border)', background: 'var(--nc-bg2)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--nc-text)' }}>Account &amp; security</p>
        <p className="text-xs" style={{ color: 'var(--nc-text2)' }}>Manage your password, email, and account.</p>
      </div>

      {/* ── Change password ─────────────────────────────────────────────── */}
      <div className="border-b" style={{ borderColor: 'var(--nc-border)' }}>
        {rowBtn('Change password', 'password')}
        {open === 'password' && (
          <div className="px-5 pb-5">
            {isGoogle ? (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
                You sign in with Google, so there&apos;s no password to change here — your sign-in is managed by your Google account.
              </p>
            ) : (
              <form onSubmit={changePassword} className="space-y-3">
                <input type="password" value={curPw}  onChange={e => setCurPw(e.target.value)}  placeholder="Current password" className={inputCls} style={inputStyle} autoComplete="current-password" />
                <input type="password" value={newPw}  onChange={e => setNewPw(e.target.value)}  placeholder="New password"     className={inputCls} style={inputStyle} autoComplete="new-password" />
                <input type="password" value={newPw2} onChange={e => setNewPw2(e.target.value)} placeholder="Confirm new password" className={inputCls} style={inputStyle} autoComplete="new-password" />
                <p className="text-xs" style={{ color: 'var(--nc-text2)' }}>7+ chars · one number · one special character</p>
                {pwMsg && <p className={`text-xs ${pwMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{pwMsg.text}</p>}
                <button type="submit" disabled={pwBusy || !curPw || !newPw} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed">
                  {pwBusy ? 'Updating…' : 'Update password'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ── Change email ────────────────────────────────────────────────── */}
      <div className="border-b" style={{ borderColor: 'var(--nc-border)' }}>
        {rowBtn('Change email', 'email')}
        {open === 'email' && (
          <div className="px-5 pb-5">
            {isGoogle ? (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
                Your email comes from your Google account and is managed there.
              </p>
            ) : (
              <form onSubmit={changeEmail} className="space-y-3">
                <p className="text-xs" style={{ color: 'var(--nc-text2)' }}>Current: <span style={{ color: 'var(--nc-text)' }}>{user.email}</span></p>
                <input type="email"    value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="New email address" className={inputCls} style={inputStyle} autoComplete="email" />
                <input type="password" value={emailPw}  onChange={e => setEmailPw(e.target.value)}  placeholder="Current password"   className={inputCls} style={inputStyle} autoComplete="current-password" />
                {emailMsg && <p className={`text-xs ${emailMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{emailMsg.text}</p>}
                <button type="submit" disabled={emailBusy || !newEmail.trim() || !emailPw} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed">
                  {emailBusy ? 'Updating…' : 'Update email'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ── Delete account ──────────────────────────────────────────────── */}
      <div>
        {rowBtn('Delete account', 'delete', true)}
        {open === 'delete' && (
          <div className="px-5 pb-5">
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
              <p className="mb-3 text-xs leading-relaxed text-red-300">
                This permanently deletes your account, profile, and token balance. This cannot be undone.
                Type your email <span className="font-semibold">{user.email}</span> to confirm.
              </p>
              <form onSubmit={deleteAccount} className="space-y-3">
                <input
                  type="email"
                  value={confirmEmail}
                  onChange={e => { setConfirmEmail(e.target.value); setDelErr(null) }}
                  placeholder="Type your email to confirm"
                  className={inputCls}
                  style={inputStyle}
                  autoComplete="off"
                />
                {delErr && <p className="text-xs text-red-400">{delErr}</p>}
                <button
                  type="submit"
                  disabled={delBusy || confirmEmail.trim().toLowerCase() !== (user.email ?? '').toLowerCase()}
                  className="rounded-lg border border-red-500/50 bg-red-600/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {delBusy ? 'Deleting…' : 'Permanently delete my account'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
