'use client'

import { useState, useEffect } from 'react'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (...args: any[]) => void
  }
}

const GRAD = 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)'

export default function CookieConsent() {
  const [show, setShow] = useState(false)

  useEffect(() => {
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
        className="flex w-full max-w-2xl flex-col items-center gap-3 rounded-2xl border px-5 py-4 shadow-2xl sm:flex-row sm:gap-4"
        style={{ background: 'var(--nc-bg2)', borderColor: 'var(--nc-border)' }}
      >
        <p className="flex-1 text-center text-sm leading-snug sm:text-left" style={{ color: 'var(--nc-text2)' }}>
          We use cookies to personalize your site experience and analyze the site traffic.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => decide(false)}
            className="rounded-xl px-5 py-2 text-sm font-bold text-black transition hover:opacity-90"
            style={{ background: GRAD, opacity: 0.8 }}
          >
            Decline
          </button>
          <button
            onClick={() => decide(true)}
            className="rounded-xl px-5 py-2 text-sm font-bold text-black transition hover:opacity-90"
            style={{ background: GRAD }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
