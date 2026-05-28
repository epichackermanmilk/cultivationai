'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function UnsubscribeForm() {
  const searchParams = useSearchParams()
  const [email,     setEmail]     = useState('')
  const [status,    setStatus]    = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errMsg,    setErrMsg]    = useState('')

  // Pre-fill email from query param (used in email links)
  useEffect(() => {
    const e = searchParams.get('email')
    if (e) setEmail(decodeURIComponent(e))
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setErrMsg('')
    try {
      const r = await fetch('/api/unsubscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim() }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        setErrMsg((d as { error?: string }).error ?? 'Something went wrong.')
        setStatus('error')
        return
      }
      setStatus('done')
    } catch {
      setErrMsg('Network error — please try again.')
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="mb-2 text-lg font-bold text-emerald-400">You've been unsubscribed</h2>
        <p className="text-sm mb-5" style={{ color: 'var(--nc-text2)' }}>
          <strong className="text-emerald-400">{email}</strong> will no longer receive marketing
          emails from NovelBrain. You can re-enable notifications anytime from your{' '}
          <Link href="/profile" className="text-amber-400 hover:underline">profile</Link>.
        </p>
        <Link
          href="/library"
          className="inline-block rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition"
        >
          Back to library
        </Link>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border p-6 space-y-4"
      style={{ borderColor: 'var(--nc-border)', background: 'var(--nc-bg2)' }}
    >
      <div>
        <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--nc-text)' }}>
          Your email address
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
          style={{ background: 'var(--nc-bg)', borderColor: 'var(--nc-border)', color: 'var(--nc-text)' }}
        />
      </div>

      {status === 'error' && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {errMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading' || !email.trim()}
        className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {status === 'loading' ? 'Processing…' : 'Unsubscribe'}
      </button>

      <p className="text-center text-xs" style={{ color: 'var(--nc-text2)' }}>
        You can re-subscribe anytime from your{' '}
        <Link href="/profile" className="text-amber-400 hover:underline">profile settings</Link>.
      </p>
    </form>
  )
}

export default function UnsubscribePage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-12" style={{ color: 'var(--nc-text)' }}>
      {/* Back */}
      <Link
        href="/library"
        className="mb-6 inline-flex items-center gap-1.5 text-xs transition hover:text-amber-400"
        style={{ color: 'var(--nc-text2)' }}
      >
        ← Back to library
      </Link>

      <h1 className="mb-1 text-2xl font-bold text-amber-400">Unsubscribe</h1>
      <p className="mb-8 text-sm" style={{ color: 'var(--nc-text2)' }}>
        Enter the email address you signed up with and we'll remove you from all marketing
        communications immediately.
      </p>

      <Suspense fallback={
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
        </div>
      }>
        <UnsubscribeForm />
      </Suspense>

      <p className="mt-6 text-center text-xs" style={{ color: 'var(--nc-text2)' }}>
        If you have an account, you can also manage notifications in your{' '}
        <Link href="/profile" className="text-amber-400 hover:underline">profile</Link>.
      </p>
    </div>
  )
}
