'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/lib/auth-context'

type Step = 'email' | 'login' | 'signup'

interface Props {
  onClose: () => void
  /** Pixel offset from the right edge of the viewport (default 16) */
  rightOffset?: number
  /** Pixel offset from the top of the viewport (default 64 — just below a typical header) */
  topOffset?: number
}

/** Password rules: 7+ chars, at least one digit, at least one special char */
function validatePassword(pw: string): string | null {
  if (pw.length < 7)               return 'At least 7 characters required'
  if (!/\d/.test(pw))              return 'Must include a number'
  if (!/[^A-Za-z0-9]/.test(pw))   return 'Must include a special character'
  return null
}

export default function AuthPanel({ onClose, rightOffset = 16, topOffset = 64 }: Props) {
  const { refresh } = useAuth()
  const panelRef = useRef<HTMLDivElement>(null)

  const [step,         setStep]         = useState<Step>('email')
  const [email,        setEmail]        = useState('')
  const [username,     setUsername]     = useState('')
  const [password,     setPassword]     = useState('')
  const [emailConsent, setEmailConsent] = useState(true)
  const [error,        setError]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [checking,     setChecking]     = useState(false)

  // ── Close on Escape ───────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node))
        onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  // ── Step 1: check if email has an account ─────────────────────────────────
  const checkEmail = async () => {
    const trimmed = email.trim()
    if (!trimmed || !/\S+@\S+\.\S+/.test(trimmed)) {
      setError('Enter a valid email address'); return
    }
    setError(''); setChecking(true)
    try {
      const r = await fetch('/api/auth/check-email', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: trimmed }),
      })
      const d = await r.json()
      setStep(d.exists ? 'login' : 'signup')
    } catch {
      setError('Connection error — please try again')
    } finally {
      setChecking(false)
    }
  }

  const resetToEmail = () => {
    setStep('email'); setPassword(''); setUsername(''); setError(''); setEmailConsent(true)
  }

  // ── Step 2a: sign in ──────────────────────────────────────────────────────
  const login = async () => {
    if (!password) { setError('Enter your password'); return }
    setError(''); setLoading(true)
    try {
      const r = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), password }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Incorrect password'); return }
      await refresh()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2b: create account ───────────────────────────────────────────────
  const signup = async () => {
    if (!username.trim()) { setError('Choose a username'); return }
    const pwErr = validatePassword(password)
    if (pwErr) { setError(pwErr); return }
    setError(''); setLoading(true)
    try {
      const r = await fetch('/api/auth/signup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), password, username: username.trim(), email_marketing_consent: emailConsent }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Could not create account'); return }
      await refresh()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────
  const googleSignIn = () => {
    // Supabase Google OAuth — requires Google provider enabled in Supabase dashboard
    const base     = process.env.NEXT_PUBLIC_SUPABASE_URL
    const redirect = `${window.location.origin}/auth/callback`
    if (base) {
      window.location.href =
        `${base}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirect)}`
    }
  }

  // ── Shared input class ────────────────────────────────────────────────────
  const inputCls =
    'w-full rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 ' +
    'outline-none border transition ' +
    'bg-black/40 border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40'

  const btnPrimary =
    'w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-black ' +
    'hover:bg-amber-400 transition disabled:opacity-40 disabled:cursor-not-allowed'

  return createPortal(
    /* Full-viewport overlay — click outside the card to close */
    <div className="fixed inset-0 z-[9999]">
      <div
        ref={panelRef}
        className="absolute w-80 rounded-2xl p-5 shadow-2xl shadow-black/70"
        style={{
          right:             rightOffset,
          top:               topOffset,
          background:        'rgba(10,10,14,0.96)',
          backdropFilter:    'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {/* Semi-transparent close × */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 text-lg leading-none transition hover:text-zinc-300"
          style={{ color: 'rgba(161,161,170,0.5)' }}   /* zinc-400 @ 50% */
        >
          ×
        </button>

        {/* ── Email step ────────────────────────────────────────────────── */}
        {step === 'email' && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500 pr-5">
              Enter your email to sign in or create an account
            </p>

            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && checkEmail()}
              placeholder="you@example.com"
              autoFocus
              className={inputCls}
            />

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              onClick={checkEmail}
              disabled={checking || !email.trim()}
              className={btnPrimary}
            >
              {checking ? 'Checking…' : 'Continue →'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-2 py-1">
              <div className="flex-1 border-t border-zinc-800" />
              <span className="text-xs text-zinc-700">or</span>
              <div className="flex-1 border-t border-zinc-800" />
            </div>

            {/* Google */}
            <button
              onClick={googleSignIn}
              className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-zinc-800 py-2.5 text-sm font-medium text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition"
            >
              {/* Google colour logo */}
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
          </div>
        )}

        {/* ── Login step ────────────────────────────────────────────────── */}
        {step === 'login' && (
          <div className="space-y-3">
            {/* Breadcrumb back to email */}
            <button
              onClick={resetToEmail}
              className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition pr-5"
            >
              <span>←</span>
              <span className="truncate max-w-[200px]">{email}</span>
            </button>

            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && login()}
              placeholder="Password"
              autoFocus
              className={inputCls}
            />

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              onClick={login}
              disabled={loading || !password}
              className={btnPrimary}
            >
              {loading
                ? <span className="inline-flex items-center justify-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-black border-t-transparent animate-spin" />
                    Signing in…
                  </span>
                : 'Sign In'}
            </button>
          </div>
        )}

        {/* ── Signup step ───────────────────────────────────────────────── */}
        {step === 'signup' && (
          <div className="space-y-3">
            {/* Breadcrumb */}
            <button
              onClick={resetToEmail}
              className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition pr-5"
            >
              <span>←</span>
              <span className="truncate max-w-[200px]">{email}</span>
            </button>

            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError('') }}
              placeholder="Choose a username"
              autoFocus
              className={inputCls}
            />

            <div>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && signup()}
                placeholder="Create password"
                className={inputCls}
              />
              <p className="mt-1.5 text-xs" style={{ color: 'rgba(113,113,122,0.7)' }}>
                7+ chars · one number · one special character
              </p>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            {/* Email marketing opt-in */}
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={emailConsent}
                  onChange={e => setEmailConsent(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="h-4 w-4 rounded border border-zinc-700 peer-checked:border-amber-500 peer-checked:bg-amber-500 transition flex items-center justify-center">
                  {emailConsent && (
                    <svg className="h-2.5 w-2.5 text-black" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-xs leading-relaxed" style={{ color: 'rgba(113,113,122,0.85)' }}>
                Get notified about new features, novels, and updates
              </span>
            </label>

            <button
              onClick={signup}
              disabled={loading || !username.trim() || !password}
              className={btnPrimary}
            >
              {loading
                ? <span className="inline-flex items-center justify-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-black border-t-transparent animate-spin" />
                    Creating account…
                  </span>
                : 'Create Account'}
            </button>

            <p className="text-center text-xs" style={{ color: 'rgba(113,113,122,0.7)' }}>
              🎁 100 free tokens on sign-up
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
