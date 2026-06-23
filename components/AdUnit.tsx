'use client'

// Network-agnostic ad slot. Renders the configured AD_NETWORK for a given placement.
// Callers just say <AdUnit placement="readerTop" />. Hidden for ad-free users
// (one-time ad-free purchase or active subscription) so the gate lives in one place.

import AdSenseAd from '@/components/AdSenseAd'
import AdsterraBanner from '@/components/AdsterraBanner'
import HouseAd from '@/components/HouseAd'
import { useAuth } from '@/lib/auth-context'
import { AD_NETWORK, AD_MODE, ADSENSE_SLOTS, ADSTERRA, type Placement } from '@/lib/ads'

export default function AdUnit({ placement, className, refreshKey }: {
  placement: Placement; className?: string; refreshKey?: string | number
}) {
  const { user } = useAuth()
  if (user?.ads_disabled || user?.subscription_active) return null

  // House-ad mode: fill every slot with our own promo instead of a blank network box.
  if (AD_MODE === 'house') return <HouseAd className={className} />

  if (AD_NETWORK === 'adsense') {
    return <AdSenseAd slot={ADSENSE_SLOTS[placement]} refreshKey={refreshKey} className={className} />
  }
  if (AD_NETWORK === 'adsterra') {
    const c = ADSTERRA[placement]
    return <AdsterraBanner adKey={c.key} width={c.width} height={c.height} className={className} />
  }
  return null
}
