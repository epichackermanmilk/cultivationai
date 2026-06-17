'use client'

// Sticky glass header shared by every /test* page. Mirrors the AsuraScans top bar:
// logo · centered nav · search · auth control. Account-gated destinations route
// through /testlogin?return=<dest> when signed out so users land back where they
// intended after authenticating.

import Link from 'next/link'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

interface NavItem { label: string; href: string; auth?: boolean }

const NAV: NavItem[] = [
  { label: 'Home',      href: '/testnewlibrary' },
  { label: 'Bookmarks', href: '/testbookmarks', auth: true },
  { label: 'Browse',     href: '/testbrowse' },
  { label: 'Characters', href: '/testcharacters', auth: true },
  { label: 'Games',      href: '/testgames',     auth: true },
  { label: 'Recommend',  href: '/testrecommend', auth: true },
]

/** Where a nav link should actually point given the current auth state. Only
 *  account-gated links (auth === true) bounce through /testlogin when signed out. */
export function gatedHref(dest: string, isAuthed: boolean, auth = false): string {
  if (!auth || isAuthed) return dest
  return `/testlogin?return=${encodeURIComponent(dest)}`
}

export default function TestHeader() {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [q, setQ] = useState('')

  const isAuthed = !!user

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    const v = q.trim()
    router.push(v ? `/testbrowse?q=${encodeURIComponent(v)}` : '/testbrowse')
  }

  const active = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <header className="sticky top-0 z-50 tnl-glass">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
        <Link href="/testnewlibrary" className="flex shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black"
            style={{ background: 'rgba(var(--v),0.9)', boxShadow: '0 0 20px rgba(var(--v),0.5)' }}>NC</span>
          <span className="hidden text-lg font-bold tracking-tight sm:block">NovelCodex</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map(item => (
            <Link key={item.label} href={gatedHref(item.href, isAuthed, item.auth)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-white/5 hover:text-white ${
                active(item.href) ? 'text-white' : 'text-white/70'
              }`}>
              {item.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="relative mx-auto w-full max-w-md">
          <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search novels, characters, lore…"
            className="h-10 w-full rounded-full border border-white/10 bg-black/30 pl-10 pr-4 text-sm text-white placeholder-white/40 outline-none backdrop-blur-md transition focus:border-[rgba(var(--v),0.6)] focus:bg-black/40" />
        </form>

        {isAuthed ? (
          <Link href="/testprofile" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: 'rgba(var(--v),0.85)' }}>
            {(user!.username || user!.email || '?')[0]?.toUpperCase()}
          </Link>
        ) : (
          <Link href={`/testlogin?return=${encodeURIComponent(pathname || '/testnewlibrary')}`}
            className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition hover:brightness-110"
            style={{ background: 'rgba(var(--v),0.9)', boxShadow: '0 0 18px rgba(var(--v),0.4)' }}>Sign in</Link>
        )}
      </div>
    </header>
  )
}
