'use client'

// House ad shown in ad slots while third-party fill is ~0. Promotes our own Chrome
// extension (vertical integration) instead of leaving a blank box. Non-dismissible —
// it IS the slot's content.

import { EXTENSION } from '@/lib/extension'
import { track } from '@/lib/analytics'

export default function HouseAd({ className }: { className?: string }) {
  return (
    <div className={className}>
      <a href={EXTENSION.url} target="_blank" rel="noopener noreferrer"
        onClick={() => track('ext_install_click', { source: 'house_ad' })}
        className="mx-auto flex max-w-3xl items-center gap-3 rounded-xl border border-[rgba(var(--v),0.3)] px-4 py-3 transition hover:brightness-110"
        style={{ background: 'linear-gradient(110deg, rgba(var(--v),0.16), rgba(255,255,255,0.02))' }}>
        <span className="text-xl">🌐</span>
        <span className="min-w-0 flex-1 text-sm">
          <span className="font-bold text-white">{EXTENSION.name}</span>
          <span className="ml-2 text-white/60">{EXTENSION.tagline}</span>
        </span>
        <span className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-white" style={{ background: 'rgb(var(--v))' }}>Add to Chrome</span>
      </a>
    </div>
  )
}
