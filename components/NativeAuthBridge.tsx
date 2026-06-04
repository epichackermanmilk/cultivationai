'use client'

import { useEffect } from 'react'
import { isNativeAppClient } from '@/lib/native'

// Native app only. Listens for the OAuth deep link (org.novelcodex.app://auth-callback)
// fired after Google sign-in completes in the system browser, then finishes the flow
// INSIDE the webview by loading /auth/callback with the token fragment — which is
// where the nc_session cookie actually gets set. No-op on the web.
/* eslint-disable @typescript-eslint/no-explicit-any */
export default function NativeAuthBridge() {
  useEffect(() => {
    if (!isNativeAppClient()) return
    const cap = (window as any).Capacitor
    const App = cap?.Plugins?.App
    const Browser = cap?.Plugins?.Browser
    if (!App?.addListener) return

    let handle: any
    const onOpen = (data: { url?: string }) => {
      const url = data?.url || ''
      if (!url.startsWith('org.novelcodex.app://auth-callback')) return
      try { Browser?.close?.() } catch { /* ignore */ }
      const hash = url.includes('#') ? url.slice(url.indexOf('#')) : ''
      // Finish sign-in in the webview (this request's Set-Cookie lands in the app).
      window.location.href = '/auth/callback' + hash
    }

    try {
      const res = App.addListener('appUrlOpen', onOpen)
      if (res?.then) res.then((h: any) => { handle = h })
      else handle = res
    } catch { /* ignore */ }

    return () => { try { handle?.remove?.() } catch { /* ignore */ } }
  }, [])

  return null
}
