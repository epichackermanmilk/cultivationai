'use client'

// Keeps a full-screen chat sized to the *visible* viewport on mobile. The on-screen
// keyboard overlays the page (it doesn't shrink 100vh/100dvh reliably on iOS), so we
// track window.visualViewport and expose its height as --chat-vh. Also neutralizes the
// global bottom-nav padding + page scroll while the chat is mounted, so there's no dead
// space under the input bar.

import { useEffect } from 'react'

export default function ChatViewport() {
  useEffect(() => {
    const root = document.documentElement
    const vv = window.visualViewport
    const set = () => root.style.setProperty('--chat-vh', `${Math.round(vv?.height ?? window.innerHeight)}px`)
    set()
    vv?.addEventListener('resize', set)
    vv?.addEventListener('scroll', set)
    window.addEventListener('resize', set)

    const prevPad = document.body.style.paddingBottom
    const prevOf = document.body.style.overflow
    document.body.style.paddingBottom = '0px'
    document.body.style.overflow = 'hidden'

    return () => {
      vv?.removeEventListener('resize', set)
      vv?.removeEventListener('scroll', set)
      window.removeEventListener('resize', set)
      root.style.removeProperty('--chat-vh')
      document.body.style.paddingBottom = prevPad
      document.body.style.overflow = prevOf
    }
  }, [])
  return null
}
