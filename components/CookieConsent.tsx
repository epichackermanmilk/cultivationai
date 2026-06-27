'use client'

import { useState, useEffect } from 'react'
import { isNativeAppClient } from '@/lib/native'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (...args: any[]) => void
  }
}

export default function CookieConsent() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Native app: don't show the web cookie banner. Consent Mode stays at its
    // privacy-safe default (denied), and there's no AdSense/GA in the app shell.
    if (isNativeAppClient()) return
    try {
      if (!localStorage.getItem('nc_cookie_consent')) setShow(true)
    } catch { /* localStorage blocked — don't show */ }
  }, [])

  function decide(granted: boolean) {
    try { localStorage.setItem('nc_cookie_consent', granted ? 'granted' : 'denied') } catch { /* ignore */ }

    // Google Consent Mode v2 — flip ad + analytics storage on the user's choice
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        ad_storage:         granted ? 'granted' : 'denied',
        analytics_storage:  granted ? 'granted' : 'denied',
        ad_user_data:       granted ? 'granted' : 'denied',
        ad_personalization: granted ? 'granted' : 'denied',
      })
    }
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] flex justify-center px-3 pb-20 pt-3 sm:p-4">
      <div
        className="flex w-full max-w-2xl flex-col items-center gap-3 rounded-2xl border border-white/12 px-5 py-4 text-white shadow-2xl sm:flex-row sm:gap-4"
        style={{ background: 'rgba(18,15,30,0.95)', backdropFilter: 'blur(12px)' }}
      >
        <p className="flex-1 text-center text-sm leading-snug text-white/65 sm:text-left">
          We use cookies to personalize your experience and analyze site traffic.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => decide(false)}
            className="rounded-xl border border-white/15 px-5 py-2 text-sm font-semibold text-white/65 transition hover:text-white"
          >
            Decline
          </button>
          <button
            onClick={() => decide(true)}
            className="rounded-xl px-5 py-2 text-sm font-bold text-white transition hover:brightness-110"
            style={{ background: 'rgb(124,58,237)' }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
