'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  {
    href: '/library',
    label: 'Library',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </svg>
    ),
  },
  {
    href: '/chat',
    label: 'Chat',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
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
    label: 'Discover',
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

  // Hide on novel pages and game play pages (full-screen experience — no bottom chrome needed)
  if (pathname.startsWith('/novel/')) return null
  if (pathname.startsWith('/games/')) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden border-t border-[var(--nc-border)]"
      style={{ background: 'var(--nc-bg2)' }}>
      <div className="flex items-stretch">
        {TABS.map(tab => {
          const active = pathname === tab.href || (tab.href !== '/library' && pathname.startsWith(tab.href))
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors ${
                active ? 'text-amber-400' : 'text-zinc-500'
              }`}
            >
              <span className={active ? 'text-amber-400' : 'text-zinc-500'}>
                {tab.icon}
              </span>
              {tab.label}
            </Link>
          )
        })}
      </div>
      {/* Safe area spacer for iPhone home indicator */}
      <div className="h-safe-bottom" style={{ height: 'env(safe-area-inset-bottom)' }} />
    </nav>
  )
}
