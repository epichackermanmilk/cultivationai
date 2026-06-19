'use client'

// Shown in place of a locked chapter's text. Unlock with tokens or subscribe.

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { UNLOCK_COST } from '@/lib/locks'
import { track } from '@/lib/analytics'

export default function ChapterPaywall({ slug, novelTitle, chapterNumber, prev }: {
  slug: string; novelTitle: string; chapterNumber: number; prev: number | null
}) {
  const { user, updateTokens } = useAuth()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function unlock() {
    if (busy) return
    setBusy(true); setErr(null)
    try {
      const r = await fetch(`/api/novels/${slug}/unlock`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chapter: chapterNumber }) })
      const d = await r.json()
      if (!r.ok) { setErr(d.code === 'INSUFFICIENT' ? 'Not enough tokens — top up in the shop.' : (d.error || 'Could not unlock')); return }
      if (typeof d.tokens === 'number') updateTokens(d.tokens)
      track('chapter_unlock', { slug, chapter: chapterNumber })
      window.location.reload()
    } catch { setErr('Network error — try again') } finally { setBusy(false) }
  }

  const returnTo = `/novel/${slug}/read/${chapterNumber}`

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-5 text-white" style={{ ['--v' as string]: '124,58,237', background: '#07060d' }}>
      <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: 'radial-gradient(80% 55% at 50% 0%, rgba(var(--v),0.18) 0%, transparent 60%)' }} />
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[rgba(18,15,30,0.7)] p-7 text-center backdrop-blur">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'rgba(var(--v),0.15)' }}>
          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" style={{ color: 'rgb(var(--v))' }} stroke="currentColor" strokeWidth="1.8"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" strokeLinecap="round" /></svg>
        </span>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/40">{novelTitle}</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">Chapter {chapterNumber} is locked</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-white/55">
          The latest chapters of every novel are reserved for supporters. Subscribe for unlimited access, or unlock this chapter with tokens.
        </p>

        {!user ? (
          <Link href={`/login?return=${encodeURIComponent(returnTo)}`} className="mt-6 inline-block w-full rounded-xl py-3 text-sm font-bold text-white transition hover:brightness-110" style={{ background: 'rgb(var(--v))' }}>Sign in to continue</Link>
        ) : (
          <div className="mt-6 space-y-2.5">
            <Link href="/shop" className="block w-full rounded-xl py-3 text-sm font-bold text-white transition hover:brightness-110" style={{ background: 'rgb(var(--v))', boxShadow: '0 8px 24px rgba(var(--v),0.4)' }}>Subscribe — unlimited locked chapters</Link>
            <button onClick={unlock} disabled={busy} className="w-full rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-50">
              {busy ? 'Unlocking…' : `Unlock this chapter — ${UNLOCK_COST} tokens`}
            </button>
            <p className="text-xs text-white/40">Balance: {(user.tokens ?? 0).toLocaleString()} tokens</p>
            {err && <p className="text-xs text-red-400">{err}</p>}
          </div>
        )}

        <div className="mt-5 flex items-center justify-center gap-4 text-xs text-white/45">
          {prev && <Link href={`/novel/${slug}/read/${prev}`} className="transition hover:text-white">‹ Previous (free)</Link>}
          <Link href={`/novel/${slug}`} className="transition hover:text-white">Chapter list</Link>
        </div>
      </div>
    </div>
  )
}
