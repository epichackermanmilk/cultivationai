'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function SuccessContent() {
  const params = useSearchParams()
  const sessionId = params.get('session_id')

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
        <svg className="h-10 w-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>

      <h1 className="mb-3 text-2xl font-bold text-emerald-400">Payment successful</h1>
      <p className="mb-2 text-base" style={{ color: 'var(--nc-text)' }}>
        Your tokens are being added to your account.
      </p>
      <p className="mb-8 text-sm" style={{ color: 'var(--nc-text2)' }}>
        It may take a few seconds to reflect in your balance. Refresh your profile if you don&apos;t see them right away.
      </p>

      {sessionId && (
        <p className="mb-6 text-xs" style={{ color: 'var(--nc-text2)' }}>
          Reference: <span className="font-mono text-zinc-400">{sessionId.slice(-12)}</span>
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/library"
          className="rounded-full px-8 py-3 text-sm font-bold text-black transition-all hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)', boxShadow: '0 8px 24px rgba(245,158,11,0.25)' }}
        >
          Go to Library
        </Link>
        <Link
          href="/profile"
          className="rounded-full border px-8 py-3 text-sm font-semibold transition hover:border-amber-500/50"
          style={{ borderColor: 'var(--nc-border)', color: 'var(--nc-text2)' }}
        >
          View Balance
        </Link>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>
      <Suspense fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </div>
  )
}
