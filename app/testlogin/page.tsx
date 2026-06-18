'use client'

// /testlogin — a full-page, professional sign-in experience (replacing the corner
// popup). Styled to match the /test* redesign: dark, glassy, purple accent. Honors
// ?return=<path> so account-gated nav lands users back where they intended.

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { track } from '@/lib/analytics'
import { TestStyles } from '@/components/TestUI'

function validatePassword(pw: string): string | null {
  if (pw.length < 7) return 'At least 7 characters required'
  if (!/\d/.test(pw)) return 'Must include a number'
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Must include a special character'
  return null
}

function isSafeReturn(p: string | null): p is string {
  // Only allow same-site absolute paths (no protocol-relative // or external URLs).
  return !!p && p.startsWith('/') && !p.startsWith('//')
}

function LoginInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const { user, refresh, loading: authLoading } = useAuth()

  const returnTo = isSafeReturn(sp.get('return')) ? sp.get('return')! : '/testnewlibrary'

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [emailConsent, setEmailConsent] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Already signed in → bounce straight to the destination.
  useEffect(() => {
    if (!authLoading && user) router.replace(returnTo)
  }, [authLoading, user, returnTo, router])

  const login = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email address'); return }
    if (!password) { setError('Enter your password'); return }
    setError(''); setLoading(true)
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Incorrect email or password'); return }
      track('login', { method: 'email' })
      await refresh()
      router.replace(returnTo)
    } catch {
      setError('Connection error — please try again')
    } finally { setLoading(false) }
  }

  const signup = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email address'); return }
    if (!username.trim()) { setError('Choose a username'); return }
    const pwErr = validatePassword(password)
    if (pwErr) { setError(pwErr); return }
    setError(''); setLoading(true)
    try {
      const r = await fetch('/api/auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, username: username.trim(), email_marketing_consent: emailConsent }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Could not create account'); return }
      track('sign_up', { method: 'email' })
      await refresh()
      router.replace(returnTo)
    } catch {
      setError('Connection error — please try again')
    } finally { setLoading(false) }
  }

  const googleSignIn = () => {
    track('google_click', { source: 'testlogin' })
    try { sessionStorage.setItem('nc_return_to', returnTo) } catch { /* ignore */ }
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!base) { setError('Google sign-in is unavailable right now'); return }
    const redirect = `${window.location.origin}/auth/callback`
    window.location.href = `${base}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirect)}`
  }

  const submit = (e: React.FormEvent) => { e.preventDefault(); if (mode === 'login') login(); else signup() }

  const inputCls =
    'w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 text-sm text-white placeholder-white/35 ' +
    'outline-none transition focus:border-[rgba(var(--v),0.6)] focus:bg-black/50'

  return (
    <div className="tnl-root relative flex min-h-screen flex-col items-center justify-center px-4 text-white"
      style={{ ['--v' as string]: '124,58,237' }}>
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: '#07060d' }}>
        <div className="absolute inset-0" style={{
          background: `radial-gradient(80% 60% at 50% -10%, rgba(var(--v),0.30) 0%, transparent 55%),
                       radial-gradient(60% 50% at 80% 110%, rgba(var(--v),0.18) 0%, transparent 55%)` }} />
      </div>

      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-7 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-base font-black"
            style={{ background: 'rgba(var(--v),0.9)', boxShadow: '0 0 26px rgba(var(--v),0.55)' }}>NC</span>
          <h1 className="text-2xl font-black tracking-tight">
            WELCOME TO <span style={{ color: 'rgb(var(--v))' }}>NOVELCODEX</span>
          </h1>
          <p className="mt-1.5 text-sm text-white/50">
            {mode === 'login' ? 'Log in or create an account to start reading.' : 'Create your free account to start reading.'}
          </p>
        </div>

        {/* Card */}
        <div className="tnl-panel p-6">
          <button onClick={googleSignIn}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-white py-3 text-sm font-semibold text-zinc-900 transition hover:bg-white/90">
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs uppercase tracking-widest text-white/30">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">Username</label>
                <input value={username} onChange={e => { setUsername(e.target.value); setError('') }}
                  placeholder="Choose a username" className={inputCls} autoComplete="username" />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">Email address</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="you@example.com" className={inputCls} autoComplete="email" autoFocus={mode === 'login'} />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium text-white/60">Password</label>
                {mode === 'login' && (
                  <Link href="/forgot-password" className="text-xs text-white/45 transition hover:text-[rgb(var(--v))]">Forgot password?</Link>
                )}
              </div>
              <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder={mode === 'login' ? 'Enter your password' : 'Create a password'} className={inputCls}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              {mode === 'signup' && <p className="mt-1.5 text-[11px] text-white/35">7+ chars · one number · one special character</p>}
            </div>

            {mode === 'signup' && (
              <label className="flex cursor-pointer select-none items-start gap-2">
                <input type="checkbox" checked={emailConsent} onChange={e => setEmailConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--v))]" />
                <span className="text-[11px] leading-relaxed text-white/50">Get notified about new features, novels, and updates</span>
              </label>
            )}

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-bold transition hover:brightness-110 disabled:opacity-50"
              style={{ background: 'rgb(var(--v))', boxShadow: '0 8px 24px rgba(var(--v),0.4)' }}>
              {loading
                ? <span className="inline-flex items-center justify-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />{mode === 'login' ? 'Logging in…' : 'Creating account…'}</span>
                : (mode === 'login' ? 'Log in' : 'Create account')}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-white/50">
            {mode === 'login' ? (
              <>Don&apos;t have an account?{' '}
                <button onClick={() => { setMode('signup'); setError('') }} className="font-semibold text-[rgb(var(--v))] hover:underline">Sign up</button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button onClick={() => { setMode('login'); setError('') }} className="font-semibold text-[rgb(var(--v))] hover:underline">Log in</button>
              </>
            )}
          </p>
          {mode === 'signup' && <p className="mt-2 text-center text-xs text-white/35">🎁 50 free tokens on sign-up</p>}
        </div>

        <p className="mt-6 text-center text-[11px] uppercase tracking-widest text-white/25">NovelCodex © 2026</p>
      </div>

      <TestStyles />
    </div>
  )
}

export default function TestLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#07060d' }} />}>
      <LoginInner />
    </Suspense>
  )
}
