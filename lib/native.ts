// Native-app detection.
//
// The NovelCodex Android app (Capacitor webview wrapping novelcodex.org) appends
// "NovelCodexApp" to its WebView User-Agent — see capacitor.config.json
// `android.appendUserAgent`. We use that marker to:
//   • block the Stripe checkout API when called from inside the app, and
//   • hide token-purchase UI on the shop page when running in the app.
//
// Why: Google Play requires digital goods/services consumed inside an app to use
// Google Play Billing. NovelCodex sells tokens via Stripe on the web, so the app
// must NOT offer or complete those purchases in-app — it routes users to the site.

export const NATIVE_APP_UA_MARKER = 'NovelCodexApp'

/** Server-side: does this request's User-Agent header come from the native app? */
export function isNativeAppUA(ua: string | null | undefined): boolean {
  return !!ua && ua.includes(NATIVE_APP_UA_MARKER)
}

/** Client-side: is this page currently running inside the native app webview? */
export function isNativeAppClient(): boolean {
  if (typeof navigator === 'undefined') return false
  return navigator.userAgent.includes(NATIVE_APP_UA_MARKER)
}
