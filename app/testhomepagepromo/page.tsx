'use client'

// PREVIEW — renders the real landing page so the extension cross-promo can be seen in
// true context: the sitewide banner (placement 1, from the global layout) sits on top,
// and the homepage "Tools" card (placement 2) appears in the feed. Placement 3 now
// lives as the house-ad inside ad slots (reader/games), not here.
// (The same placements are live on the real homepage `/`.)

import HomePage from '@/app/page'

export default function PromoPreview() {
  return <HomePage />
}
