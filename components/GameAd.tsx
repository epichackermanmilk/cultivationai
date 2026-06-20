'use client'

// Banner ad shown on game play pages. Hidden for ad-free users (purchased ad-free
// or active subscription) and on the /games listing itself.

import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import AdSenseAd from '@/components/AdSenseAd'
import { ADSENSE_SLOTS } from '@/lib/ads'

export default function GameAd() {
  const { user } = useAuth()
  const path = usePathname()
  if (user?.ads_disabled || user?.subscription_active) return null
  if (path === '/games') return null // the listing has its own footer/layout
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-3">
      <AdSenseAd slot={ADSENSE_SLOTS.gameBanner} className="min-h-[90px]" />
    </div>
  )
}
