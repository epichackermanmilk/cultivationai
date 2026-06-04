// AdMob rewarded-ad helper. The native plugin (@capacitor-community/admob) lives
// in the app; the remote site reaches it through the Capacitor bridge global, so
// the webapp build needs no extra dependency.
//
// IMPORTANT: REWARDED_AD_ID is Google's official TEST unit for now — tapping real
// ads during testing is "invalid traffic" and can get the AdMob account banned.
// Swap to the real unit (ca-app-pub-1350938260860067/7432259303) for production.
/* eslint-disable @typescript-eslint/no-explicit-any */

const REWARDED_AD_ID = 'ca-app-pub-3940256099942544/5224354917' // TEST id

function plugin(): any | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as any).Capacitor?.Plugins?.AdMob
}

/** True only inside the app with the AdMob plugin present. */
export function adsAvailable(): boolean {
  return !!plugin()
}

let inited = false

/** Shows a rewarded ad. Resolves true if the reward was earned (full view). */
export async function showRewardedAd(): Promise<boolean> {
  const AdMob = plugin()
  if (!AdMob) throw new Error('NO_BRIDGE')

  if (!inited) {
    try { await AdMob.initialize({ initializeForTesting: true }) } catch { /* non-fatal */ }
    inited = true
  }

  await AdMob.prepareRewardVideoAd({ adId: REWARDED_AD_ID })
  // v6: showRewardVideoAd resolves with the reward item when earned, else rejects.
  const reward = await AdMob.showRewardVideoAd()
  return !!reward
}
