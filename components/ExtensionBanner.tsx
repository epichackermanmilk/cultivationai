'use client'

// Slim, dismissible site-wide promo bar for our Chrome extension (AsuraScans-style:
// thin, full-width, non-intrusive, closeable). Dismissal persists in localStorage.
// `variant="reader"` is a softer inline version for inside the chapter reader.

import { useEffect, useState } from 'react'
import { EXTENSION } from '@/lib/extension'
import { track } from '@/lib/analytics'

export default function ExtensionBanner({ variant = 'site', preview = false }: { variant?: 'site' | 'reader'; preview?: boolean }) {
  const [show, setShow] = useState(preview)
  const key = 'nc_ext_banner_dismissed'

  useEffect(() => {
    if (preview) return
    try { if (localStorage.getItem(key) !== '1') setShow(true) } catch { setShow(true) }
  }, [preview])

  if (!show) return null

  const dismiss = () => {
    setShow(false)
    if (!preview) { try { localStorage.setItem(key, '1') } catch { /* ignore */ } }
    track('ext_banner_dismiss', { variant })
  }

  if (variant === 'reader') {
    return (
      <div className="my-5 flex items-center gap-3 rounded-xl border border-[rgba(var(--v),0.3)] bg-[rgba(var(--v),0.08)] px-4 py-3">
        <span className="text-lg">🌐</span>
        <p className="min-w-0 flex-1 text-sm text-white/80">
          Reading raws elsewhere? <span className="text-white/55">{EXTENSION.shortPitch} with our free Chrome extension.</span>
        </p>
        <a href={EXTENSION.url} target="_blank" rel="noopener noreferrer"
          onClick={() => track('ext_install_click', { source: 'reader' })}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110"
          style={{ background: 'rgb(var(--v))' }}>Install free</a>
        <button onClick={dismiss} aria-label="Dismiss" className="shrink-0 text-white/35 transition hover:text-white">✕</button>
      </div>
    )
  }

  return (
    <div className="relative z-40 w-full border-b border-white/10"
      style={{ background: 'linear-gradient(90deg, rgba(var(--v),0.22), rgba(var(--v),0.10))', backdropFilter: 'blur(8px)' }}>
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2 sm:px-6">
        <span className="text-base">🌐</span>
        <p className="min-w-0 flex-1 truncate text-[13px] text-white/85">
          <span className="font-semibold">New:</span> {EXTENSION.tagline}
        </p>
        <a href={EXTENSION.url} target="_blank" rel="noopener noreferrer"
          onClick={() => track('ext_install_click', { source: 'site_banner' })}
          className="shrink-0 rounded-lg px-3 py-1 text-xs font-bold text-white transition hover:brightness-110"
          style={{ background: 'rgb(var(--v))' }}>Install free →</a>
        <button onClick={dismiss} aria-label="Dismiss" className="shrink-0 text-sm text-white/45 transition hover:text-white">✕</button>
      </div>
    </div>
  )
}
