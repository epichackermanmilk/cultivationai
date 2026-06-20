'use client'

// "Download EPUB" button + range popup. Subscribers free; others pay EPUB_COST.
// Range defaults to everything the caller can read; capped to readable chapters.

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { EPUB_COST } from '@/lib/locks'
import { track } from '@/lib/analytics'

interface Access { total: number; lockThreshold: number; subscribed: boolean; unlocked: number[] }

export default function EpubDownload({ slug, novelTitle }: { slug: string; novelTitle: string }) {
  const { user, refresh } = useAuth()
  const [open, setOpen] = useState(false)
  const [acc, setAcc] = useState<Access | null>(null)
  const [from, setFrom] = useState(1)
  const [to, setTo] = useState(1)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [loadingAcc, setLoadingAcc] = useState(false)

  // Highest selectable chapter: everything for subs; otherwise the free block plus
  // the furthest chapter the reader has unlocked with tokens.
  const maxReadable = acc ? (acc.subscribed ? acc.total : Math.max(acc.lockThreshold, ...(acc.unlocked.length ? acc.unlocked : [0]))) : 1
  // Readable chapters within [from, to] (free + unlocked, never locked-unowned).
  const unlockedSet = acc ? new Set(acc.unlocked) : new Set<number>()
  let count = 0
  if (acc) for (let n = Math.max(1, from); n <= Math.min(to, maxReadable); n++) {
    if (acc.subscribed || n <= acc.lockThreshold || unlockedSet.has(n)) count++
  }

  async function openPopup() {
    setOpen(true); setErr(null); setLoadingAcc(true)
    try {
      const r = await fetch(`/api/novels/${slug}/access`)
      const d = await r.json() as Access
      d.unlocked = d.unlocked ?? []
      const mr = d.subscribed ? d.total : Math.max(d.lockThreshold, ...(d.unlocked.length ? d.unlocked : [0]))
      setAcc(d); setFrom(1); setTo(Math.max(1, mr))
    } catch { setErr('Could not load chapter info') } finally { setLoadingAcc(false) }
  }

  async function download() {
    if (busy) return
    setBusy(true); setErr(null)
    try {
      const res = await fetch(`/api/novels/${slug}/epub`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to }) })
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string; code?: string }
        setErr(d.error || 'Download failed')
        return
      }
      const blob = await res.blob()
      const cd = res.headers.get('content-disposition') || ''
      const m = cd.match(/filename="([^"]+)"/)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob); a.download = m ? m[1] : `${slug}.epub`; a.click()
      URL.revokeObjectURL(a.href)
      track('epub_download', { slug, from, to })
      if (acc && !acc.subscribed) refresh()
      setOpen(false)
    } catch { setErr('Network error — try again') } finally { setBusy(false) }
  }

  const input = 'w-24 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-center text-sm text-white outline-none focus:border-[rgba(var(--v),0.6)]'

  return (
    <>
      <button onClick={openPopup} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold backdrop-blur transition hover:bg-white/10">⬇ Download EPUB</button>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#120f1e] p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black tracking-tight">Download EPUB</h3>
            <p className="mt-0.5 truncate text-xs text-white/45">{novelTitle}</p>

            {loadingAcc ? (
              <p className="py-8 text-center text-sm text-white/40">Loading…</p>
            ) : !user ? (
              <div className="mt-5 text-center">
                <p className="mb-3 text-sm text-white/60">Sign in to download.</p>
                <Link href={`/login?return=/novel/${slug}`} className="inline-block rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: 'rgb(var(--v))' }}>Sign in</Link>
              </div>
            ) : (
              <>
                <p className="mt-4 text-sm text-white/65">Choose the chapter range to include — only chapters you can read are added (locked chapters you haven&apos;t unlocked are skipped){acc && !acc.subscribed && acc.total > acc.lockThreshold ? '; subscribe to include them all' : ''}.</p>
                <div className="mt-3 flex items-center gap-2">
                  <label className="text-xs text-white/50">From</label>
                  <input type="number" min={1} max={maxReadable} value={from} onChange={e => setFrom(Math.max(1, Math.min(maxReadable, Number(e.target.value) || 1)))} className={input} />
                  <label className="text-xs text-white/50">to</label>
                  <input type="number" min={1} max={maxReadable} value={to} onChange={e => setTo(Math.max(1, Math.min(maxReadable, Number(e.target.value) || 1)))} className={input} />
                </div>
                <p className="mt-2 text-xs text-white/50">{count.toLocaleString()} chapter{count !== 1 ? 's' : ''} · {acc?.subscribed ? <span className="font-semibold text-emerald-400">Free (subscriber)</span> : <span className="font-semibold" style={{ color: 'rgb(var(--v))' }}>{EPUB_COST} tokens</span>}</p>
                <p className="mt-1 text-[11px] text-white/35">{acc?.subscribed ? 'Up to 20 downloads per hour.' : `Up to 5 downloads per hour. Unlock more chapters anytime, then download again (${EPUB_COST} tokens).`}</p>
                {err && <p className="mt-2 text-xs text-red-400">{err}{err.includes('tokens') && <Link href="/shop" className="ml-1 underline">Shop →</Link>}</p>}
                <div className="mt-5 flex gap-2">
                  <button onClick={() => setOpen(false)} disabled={busy} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-white/70 transition hover:text-white">Cancel</button>
                  <button onClick={download} disabled={busy || count < 1} className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50" style={{ background: 'rgb(var(--v))' }}>
                    {busy ? 'Preparing…' : 'Download'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
