'use client'

// Homepage "Tools" promo card for our Chrome extension. Richer than the slim banner —
// icon, name, pitch, and an install CTA.

import { EXTENSION } from '@/lib/extension'
import { track } from '@/lib/analytics'

export default function ExtensionCard() {
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-lg font-extrabold tracking-tight">Tools</h2>
      <div className="tnl-panel flex flex-col items-start gap-4 overflow-hidden p-5 sm:flex-row sm:items-center"
        style={{ background: 'linear-gradient(110deg, rgba(var(--v),0.14), rgba(255,255,255,0.02))' }}>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl"
          style={{ background: 'rgba(var(--v),0.85)', boxShadow: '0 0 30px rgba(var(--v),0.45)' }}>🌐</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold">{EXTENSION.name}</h3>
            <span className="rounded-md border border-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-white/60">Chrome</span>
          </div>
          <p className="mt-1 text-sm text-white/60">{EXTENSION.tagline} Hit any raw chapter and read it in English instantly — then come back to NovelCodex for the full library.</p>
        </div>
        <a href={EXTENSION.url} target="_blank" rel="noopener noreferrer"
          onClick={() => track('ext_install_click', { source: 'home_card' })}
          className="shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
          style={{ background: 'rgb(var(--v))' }}>Add to Chrome — free</a>
      </div>
    </section>
  )
}
