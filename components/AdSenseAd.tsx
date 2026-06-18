'use client'

// Google AdSense display unit. The adsbygoogle.js script is loaded globally in
// app/layout.tsx. Pass a `slot` (AdSense ad-unit ID). When the slot is empty it
// renders a labelled placeholder so the position is visible before units exist.
// `refreshKey` (e.g. the chapter number) remounts the unit on content change so
// each chapter requests a fresh ad without the "already have ads" error.

import { useEffect } from 'react'
import { ADSENSE_CLIENT } from '@/lib/ads'

declare global {
  interface Window { adsbygoogle?: Record<string, unknown>[] }
}

export default function AdSenseAd({ slot, refreshKey, className }: { slot: string; refreshKey?: string | number; className?: string }) {
  useEffect(() => {
    if (!slot) return
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}) } catch { /* ignore */ }
  }, [slot, refreshKey])

  if (!slot) {
    return (
      <div className={`flex h-24 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-[11px] uppercase tracking-widest text-white/25 ${className ?? ''}`}>
        Ad slot — add AdSense unit ID
      </div>
    )
  }

  return (
    // key remounts the <ins> per chapter so adsbygoogle.push() targets a fresh element
    <ins key={`${slot}-${refreshKey}`} className={`adsbygoogle block ${className ?? ''}`} style={{ display: 'block' }}
      data-ad-client={ADSENSE_CLIENT} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
  )
}
