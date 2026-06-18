'use client'

// Ezoic ad placeholder (JavaScript "standalone" integration). Renders the Ezoic
// placeholder div and asks Ezoic to fill it on mount; destroys it on unmount so
// SPA navigation doesn't leave stale units. The numeric `id` must match a
// placeholder created in the Ezoic dashboard (Ad Settings → Placeholders).
// `refreshKey` (e.g. the chapter number) re-requests the ad when content changes.

import { useEffect } from 'react'

interface Ezstandalone {
  cmd: Array<() => void>
  showAds: (...ids: number[]) => void
  destroyPlaceholders: (...ids: number[]) => void
}
declare global {
  interface Window { ezstandalone?: Ezstandalone }
}

export default function EzoicAd({ id, refreshKey, className }: { id: number; refreshKey?: string | number; className?: string }) {
  useEffect(() => {
    const ez = window.ezstandalone
    if (!ez) return
    ez.cmd.push(() => { try { ez.showAds(id) } catch { /* ignore */ } })
    return () => {
      const e = window.ezstandalone
      if (e) e.cmd.push(() => { try { e.destroyPlaceholders(id) } catch { /* ignore */ } })
    }
  }, [id, refreshKey])

  return <div id={`ezoic-pub-ad-placeholder-${id}`} className={className} />
}
