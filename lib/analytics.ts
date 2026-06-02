// Thin wrapper over GA4 (gtag). Safe to call anywhere on the client — no-ops on
// the server or before gtag has loaded. Respects the user's consent choice
// because gtag itself is gated by Consent Mode (set in app/layout.tsx).
type Params = Record<string, string | number | boolean | undefined>

export function track(event: string, params: Params = {}) {
  if (typeof window === 'undefined') return
  const w = window as unknown as { gtag?: (...args: unknown[]) => void }
  try {
    w.gtag?.('event', event, params)
  } catch {
    /* analytics must never break the app */
  }
}
