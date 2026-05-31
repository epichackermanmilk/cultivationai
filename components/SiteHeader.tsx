'use client'

// SiteHeader — the unified navigation bar used across all content pages.
// Game play pages, novel chat, and any full-screen experience use their own
// minimal header — this component is for library/legal/profile/lobby pages.

import Link          from 'next/link'
import { usePathname } from 'next/navigation'
import TokenWidget   from '@/components/TokenWidget'

const NAV: { href: string; label: string; exact?: boolean }[] = [
  { href: '/library',    label: 'Library',        exact: true },
  { href: '/chat',       label: '✦ Chat' },
  { href: '/characters', label: '🎭 Characters' },
  { href: '/games',      label: '🎮 Games' },
  { href: '/recommend',  label: 'Discover' },
  { href: '/bookmarks',  label: 'Bookmarks' },
]

interface SiteHeaderProps {
  /** Extra element rendered after the nav links, before TokenWidget */
  rightSlot?: React.ReactNode
  /** Override the inner max-width (default max-w-7xl) */
  maxWidth?: string
}

export default function SiteHeader({ rightSlot, maxWidth = 'max-w-7xl' }: SiteHeaderProps) {
  const pathname = usePathname()

  function active(href: string, exact = false) {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--nc-border)] bg-[var(--nc-bg)]/90 backdrop-blur">
      <div className={`mx-auto flex ${maxWidth} items-center justify-between px-4 py-3`}>

        {/* Logo */}
        <Link href="/library" className="group shrink-0 flex items-center gap-3">
          <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
          <div>
            <span className="block text-xl font-bold tracking-tight text-amber-400 group-hover:text-amber-300 transition">
              NovelCodex
            </span>
            <span className="hidden lg:block text-xs text-zinc-500">
              Every secret, every character, every world — ask anything.
            </span>
          </div>
        </Link>

        {/* Nav + right slot */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {NAV.map(({ href, label, exact }) => {
            const isActive = active(href, exact)
            return (
              <Link
                key={href}
                href={href}
                className={`hidden sm:flex items-center whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? 'border-amber-500/60 bg-amber-500/10 text-amber-400'
                    : 'border-amber-500/30 bg-amber-500/5 text-amber-400/75 hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-400'
                }`}
              >
                {label}
              </Link>
            )
          })}
          {rightSlot}
          <TokenWidget />
        </div>
      </div>
    </header>
  )
}
