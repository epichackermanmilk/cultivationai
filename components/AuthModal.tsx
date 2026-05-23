'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'

interface Props {
  onClose:       () => void
  defaultTab?:   'login' | 'signup'
}

export default function AuthModal({ onClose, defaultTab = 'login' }: Props) {
  const { refresh } = useAuth()
  const [tab,      setTab]      = useState<'login' | 'signup'>(defaultTab)
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(false)

  // Reset form when switching tabs
  useEffect(() => { setError(''); setSuccess(false) }, [tab])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const submit = async () => {
    setError(''); setLoading(true)
    try {
      const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/signup'
      const r = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Something went wrong'); return }

      await refresh()
      setSuccess(true)
      setTimeout(onClose, 800)
    } finally {
      setLoading(false)
    }
  }

  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') submit() }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-[var(--nc-border)] p-6 shadow-2xl"
        style={{ background: 'var(--nc-bg2)' }}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-amber-400">NovelCodex</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition text-xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="mb-5 flex rounded-lg border border-[var(--nc-border)] overflow-hidden text-sm">
          {(['login', 'signup'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 font-medium transition ${
                tab === t ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {success ? (
          <div className="py-6 text-center">
            <div className="text-3xl mb-2">✦</div>
            <p className="text-sm text-amber-400 font-medium">
              {tab === 'signup' ? 'Account created! Welcome.' : 'Signed in!'}
            </p>
            {tab === 'signup' && (
              <p className="mt-1 text-xs text-zinc-500">100 free tokens added to your account.</p>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={onKey}
                  placeholder="you@example.com"
                  autoFocus
                  className="w-full rounded-lg border border-[var(--nc-border)] px-3 py-2.5 text-sm placeholder-zinc-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                  style={{ background: 'var(--nc-bg3)', color: 'var(--nc-text)' }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={onKey}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-[var(--nc-border)] px-3 py-2.5 text-sm placeholder-zinc-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                  style={{ background: 'var(--nc-bg3)', color: 'var(--nc-text)' }}
                />
              </div>
            </div>

            {error && (
              <p className="mb-3 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            )}

            <button
              onClick={submit}
              disabled={loading || !email || !password}
              className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  {tab === 'login' ? 'Signing in…' : 'Creating account…'}
                </span>
              ) : (
                tab === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>

            {tab === 'signup' && (
              <p className="mt-3 text-center text-xs text-zinc-500">
                🎁 100 free tokens on sign-up
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
