'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import SiteHeader from '@/components/SiteHeader'
import Footer from '@/components/Footer'
import { useAuth } from '@/lib/auth-context'
import { passwordError } from '@/lib/password'

function ResetInner() {
  const params = useSearchParams()
  const token  = params.get('token') ?? ''
  const router = useRouter()
  const { refresh } = useAuth()

  const [pw,      setPw]      = useState('')
  const [pw2,     setPw2]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [done,    setDone]    = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const pwErr = passwordError(pw)
    if (pwErr)       { setError(pwErr); return }
    if (pw !== pw2)  { setError('Passwords do not match'); return }
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/auth/reset/confirm', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password: pw }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setError(d.error ?? 'Could not reset your password'); return }
      setDone(true)
      await refresh()
      setTimeout(() => router.replace('/library'), 1600)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  const card = { borderColor: 'var(--nc-border)', background: 'var(--nc-bg2)' } as const

  if (!token) {
    return (
      <div className="rounded-2xl border p-6" style={card}>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
          This password reset link is missing its token or is malformed. Please request a new one.
        </p>
        <Link href="/forgot-password" className="mt-5 inline-block text-sm font-semibold text-amber-400 hover:underline">
          Request a new reset link →
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="rounded-2xl border p-6" style={card}>
        <div className="mb-3 text-3xl">✅</div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
          Your password has been updated and you&apos;re signed in. Taking you to your library…
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border p-6 space-y-4" style={card}>
      <div>
        <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--nc-text)' }}>New password</label>
        <input
          type="password"
          value={pw}
          onChange={e => { setPw(e.target.value); setError(null) }}
          placeholder="New password"
          autoFocus
          className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30"
          style={{ background: 'var(--nc-bg)', borderColor: 'var(--nc-border)', color: 'var(--nc-text)' }}
        />
        <p className="mt-1.5 text-xs" style={{ color: 'var(--nc-text2)' }}>7+ chars · one number · one special character</p>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--nc-text)' }}>Confirm password</label>
        <input
          type="password"
          value={pw2}
          onChange={e => { setPw2(e.target.value); setError(null) }}
          placeholder="Re-enter new password"
          className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30"
          style={{ background: 'var(--nc-bg)', borderColor: 'var(--nc-border)', color: 'var(--nc-text)' }}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading || !pw || !pw2}
        className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? 'Updating…' : 'Set new password'}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-md px-4 py-16">
        <h1 className="mb-6 text-2xl font-bold" style={{ color: 'var(--nc-text)' }}>Choose a new password</h1>
        <Suspense fallback={<p className="text-sm" style={{ color: 'var(--nc-text2)' }}>Loading…</p>}>
          <ResetInner />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
