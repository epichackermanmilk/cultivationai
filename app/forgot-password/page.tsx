'use client'

import { useState } from 'react'
import Link from 'next/link'
import SiteHeader from '@/components/SiteHeader'
import Footer from '@/components/Footer'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || !/\S+@\S+\.\S+/.test(trimmed)) { setError('Enter a valid email address'); return }
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/auth/reset/request', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: trimmed }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setError(d.error ?? 'Something went wrong — please try again'); return }
      setSent(true)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-md px-4 py-16">
        <h1 className="mb-2 text-2xl font-bold" style={{ color: 'var(--nc-text)' }}>Reset your password</h1>

        {sent ? (
          <div className="mt-6 rounded-2xl border p-6" style={{ borderColor: 'var(--nc-border)', background: 'var(--nc-bg2)' }}>
            <div className="mb-3 text-3xl">📬</div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
              If an account exists for <span className="font-semibold" style={{ color: 'var(--nc-text)' }}>{email.trim()}</span>,
              we&apos;ve sent a password reset link. Check your inbox (and your spam folder) — the link expires in 1 hour.
            </p>
            <Link href="/" className="mt-5 inline-block text-sm font-semibold text-amber-400 hover:underline">
              ← Back to NovelCodex
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm" style={{ color: 'var(--nc-text2)' }}>
              Enter the email on your account and we&apos;ll send you a link to choose a new password.
            </p>
            <form onSubmit={submit} className="rounded-2xl border p-6 space-y-4"
              style={{ borderColor: 'var(--nc-border)', background: 'var(--nc-bg2)' }}>
              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--nc-text)' }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(null) }}
                  placeholder="you@example.com"
                  autoFocus
                  className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30"
                  style={{ background: 'var(--nc-bg)', borderColor: 'var(--nc-border)', color: 'var(--nc-text)' }}
                />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
              <p className="text-center text-xs" style={{ color: 'var(--nc-text2)' }}>
                Remembered it? <Link href="/" className="font-semibold text-amber-400 hover:underline">Back to sign in</Link>
              </p>
            </form>
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}
