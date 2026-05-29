'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import TokenWidget from '@/components/TokenWidget'
import ThemeToggle from '@/components/ThemeToggle'

// Nav links shown in every page header (same as the library header)
const NAV_LINKS = [
  { href: '/chat',       label: '✦ Multi-Novel Chat' },
  { href: '/characters', label: '🎭 Characters'       },
  { href: '/recommend',  label: 'Recommend'           },
  { href: '/bookmarks',  label: 'Bookmarks'           },
]

interface Props {
  /** Optional right-side slot (e.g. novel count in library) */
  right?: React.ReactNode
  /** Max-width class — matches page content width. Default: max-w-7xl */
  maxWidth?: string
}

export default function SiteNav({ right, maxWidth = 'max-w-7xl' }: Props) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--nc-border)] bg-[var(--nc-bg)]/90 backdrop-blur">
      <div className={`mx-auto flex ${maxWidth} items-center justify-between px-4 py-3`}>

        {/* Logo */}
        <Link href="/library" className="group shrink-0">
          <h1 className="text-xl font-bold tracking-tight text-amber-400 group-hover:text-amber-300 transition">
            NovelCodex
          </h1>
          <p className="text-xs text-zinc-500 hidden sm:block">
            Every secret, every character, every world — ask anything.
          </p>
        </Link>

        {/* Nav + right slot */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`shrink-0 flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'border-amber-500/60 bg-amber-500/10 text-amber-400'
                    : 'border-zinc-700 text-zinc-300 hover:border-amber-500/50 hover:text-amber-400'
                }`}
              >
                {label}
              </Link>
            )
          })}
          <TokenWidget />
          <ThemeToggle />
          {right}
        </div>

      </div>
    </header>
  )
}
