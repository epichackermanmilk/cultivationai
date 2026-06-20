// Ad configuration — network-agnostic.
//
// `AD_NETWORK` chooses the provider for every ad slot on the site. Switch it in one
// place. Until a network's keys are filled in, slots render a labelled placeholder
// (never an error / never a layout shift).
//
//   'adsense'  — Google AdSense. Best paying, but approval is strict and is unlikely
//                to accept a site built on scraped content. Slots already filled.
//   'adsterra' — No traffic minimum, near-instant approval, tolerant of most content.
//                Sign up → create a "Banner" ad unit per size → paste its key below.
//                (Default while we bootstrap; swap to 'adsense' later if approved.)
//   'none'     — disable ads everywhere.
//
// Other no-minimum networks that work the same way (swap the invoke URL in
// AdsterraBanner if you pick one): Monetag, Hilltopads, Adcash, Galaksion, PopAds.

export type AdNetwork = 'adsense' | 'adsterra' | 'none'
export const AD_NETWORK: AdNetwork = 'adsterra'

export type Placement = 'readerTop' | 'readerBottom' | 'gameBanner'

// ── AdSense ──────────────────────────────────────────────────────────────────────
// The publisher client is loaded globally in app/layout.tsx. Create *display* ad
// units (Ads → By ad unit → Display ads) and paste each unit's "data-ad-slot".
export const ADSENSE_CLIENT = 'ca-pub-1350938260860067'
export const ADSENSE_SLOTS: Record<Placement, string> = {
  readerTop:    '9124440881',
  readerBottom: '8980970659',
  gameBanner:   '',
}

// ── Adsterra ─────────────────────────────────────────────────────────────────────
// In the Adsterra dashboard: Websites → add site → create a "Banner" ad unit for each
// size, then paste the unit "key" here. 728×90 suits desktop; it scales down on mobile.
// Adsterra lets you reuse one zone's key in multiple placements (each renders in its
// own isolated iframe), so the single 728×90 zone serves both reader slots and the
// 300×250 zone serves the game banner.
const BANNER_728x90 = 'ac25af299db16df74e0ecf1f2b762104'
const BANNER_300x250 = 'e9645b206b98282ea8e4a1db702ac883'
export const ADSTERRA: Record<Placement, { key: string; width: number; height: number }> = {
  readerTop:    { key: BANNER_728x90,  width: 728, height: 90 },
  readerBottom: { key: BANNER_728x90,  width: 728, height: 90 },
  gameBanner:   { key: BANNER_300x250, width: 300, height: 250 },
}
