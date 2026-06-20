'use client'

// Network-agnostic ad slot. Renders the configured AD_NETWORK for a given placement.
// Callers just say <AdUnit placement="readerTop" />.

import AdSenseAd from '@/components/AdSenseAd'
import AdsterraBanner from '@/components/AdsterraBanner'
import { AD_NETWORK, ADSENSE_SLOTS, ADSTERRA, type Placement } from '@/lib/ads'

export default function AdUnit({ placement, className, refreshKey }: {
  placement: Placement; className?: string; refreshKey?: string | number
}) {
  if (AD_NETWORK === 'adsense') {
    return <AdSenseAd slot={ADSENSE_SLOTS[placement]} refreshKey={refreshKey} className={className} />
  }
  if (AD_NETWORK === 'adsterra') {
    const c = ADSTERRA[placement]
    return <AdsterraBanner adKey={c.key} width={c.width} height={c.height} className={className} />
  }
  return null
}
