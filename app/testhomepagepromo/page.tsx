'use client'

// PREVIEW ONLY — design review for the Chrome-extension cross-promo before wiring it
// into production. Shows the three placements: (1) the slim sitewide banner, (2) the
// homepage "Tools" card, (3) the in-reader banner. Not linked from anywhere.

import TestHeader from '@/components/TestHeader'
import TestFooter from '@/components/TestFooter'
import { TestStyles } from '@/components/TestUI'
import ExtensionBanner from '@/components/ExtensionBanner'
import ExtensionCard from '@/components/ExtensionCard'

export default function PromoPreview() {
  return (
    <div className="tnl-root relative flex min-h-screen flex-col text-white" style={{ ['--v' as string]: '124,58,237' }}>
      <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: '#07060d' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(85% 55% at 50% -10%, rgba(var(--v),0.22) 0%, transparent 55%)' }} />
      </div>

      {/* (1) Sitewide slim banner — AsuraScans-style, sits above the header */}
      <ExtensionBanner variant="site" preview />

      <TestHeader />

      <main className="relative z-10 mx-auto w-full flex-1 max-w-[1400px] px-4 pb-24 pt-8 sm:px-6">
        <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200/90">
          Preview only — nothing here is live yet. Reviewing 3 placements for the translation extension.
          Give me the real extension <b>name</b> + <b>Chrome Web Store URL</b> and I&apos;ll wire the approved ones into production.
        </div>

        {/* (2) Homepage "Tools" card */}
        <p className="mb-1 text-xs uppercase tracking-widest text-white/30">Placement 2 — homepage card</p>
        <ExtensionCard />

        {/* (3) In-reader banner mock */}
        <p className="mb-1 mt-10 text-xs uppercase tracking-widest text-white/30">Placement 3 — inside the reader</p>
        <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h1 className="text-2xl font-black tracking-tight">Chapter 7</h1>
          <p className="mt-1 text-xs text-white/45">Draconic Pets Evolution System</p>
          <article className="mt-5 space-y-4 text-[17px] leading-[1.85] text-white/85">
            <p>&quot;And how does that help your life? I only see a decision made from the furiousness of the heart,&quot; Old Jack said, puffing his smoke as Ryuk snorted coldly.</p>
            <ExtensionBanner variant="reader" preview />
            <p>&quot;As if I&apos;ll allow what took the life of my only family member to dance freely through the skies.&quot;</p>
            <p>The wind howled across the ridge as the two figures stared each other down, neither willing to yield first.</p>
          </article>
        </div>
      </main>

      <TestFooter />
      <TestStyles />
    </div>
  )
}
