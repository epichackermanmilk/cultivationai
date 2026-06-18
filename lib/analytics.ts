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

// ── Named helpers ─────────────────────────────────────────────────────────────
// Consistent event names + params so GA reports stay clean. See ANALYTICS.md for
// the full catalogue and the business question each event answers.

/** A novel poster/row was clicked. `source` = where it was clicked from. */
export const trackNovelClick = (slug: string, source: string) => track('novel_click', { slug, source })
/** A primary nav item or other in-app link was clicked. */
export const trackNav = (label: string, source = 'header') => track('nav_click', { label, source })
/** A search was submitted. We log length, not the raw query, to avoid PII noise. */
export const trackSearch = (query: string, source: string) => track('search', { source, length: query.trim().length, has_query: query.trim().length > 0 })
