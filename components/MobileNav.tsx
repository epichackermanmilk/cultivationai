'use client'

// Mobile bottom tab bar. Mirrors the header's primary destinations (no multi-novel
// chat — that's been removed). Rendered globally; hidden on full-screen reader/game
// pages. Themed to match the dark/purple redesign.

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ACTIVE = '#a78bfa' // violet-400, reads well on the dark bar

const TABS = [
  {
    href: '/',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" />
      </svg>
    ),
  },
  {
    href: '/browse',
    label: 'Browse',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
      </svg>
    ),
  },
  {
    href: '/characters',
    label: 'Characters',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    href: '/recommend',
    label: 'Recommend',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    href: '/games',
    label: 'Games',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="2" y="7" width="20" height="14" rx="3" />
        <path d="M16 2l-4 5-4-5" />
        <path d="M9 13h6M12 10v6" />
      </svg>
    ),
  },
]

export default function MobileNav() {
  const pathname = usePathname()

  // Hide inside immersive surfaces (chapter reader + chat); everywhere else
  // (incl. games and novel detail) keeps the bottom nav for consistent navigation.
  if (pathname.includes('/read/')) return null
  if (pathname.includes('/chat') || pathname === '/chat') return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 md:hidden"
      style={{ background: 'rgba(10,8,18,0.92)', backdropFilter: 'blur(12px)' }}>
      <div className="flex items-stretch">
        {TABS.map(tab => {
          const active = tab.href === '/' ? pathname === '/' : (pathname === tab.href || pathname.startsWith(tab.href + '/'))
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors"
              style={{ color: active ? ACTIVE : 'rgba(255,255,255,0.5)' }}
            >
              {tab.icon}
              {tab.label}
            </Link>
          )
        })}
      </div>
      {/* Safe area spacer for iPhone home indicator */}
      <div style={{ height: 'env(safe-area-inset-bottom)' }} />
    </nav>
  )
}
