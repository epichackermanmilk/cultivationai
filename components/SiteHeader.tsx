'use client'

// SiteHeader — the unified two-row navigation used across all content pages.
//   Row 1: logo (far left) · search + filters (center) · TokenWidget (far right)
//   Row 2: page navigation (centered) — hidden on phones (bottom tab bar handles it)
// Game-play pages and the novel reader use their own minimal headers.

import Link            from 'next/link'
import { useState, useRef, useEffect, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import TokenWidget     from '@/components/TokenWidget'
import { FilterPanel, type Filters, type NovelLike, DEFAULT_FILTERS, filtersToParams, hasActiveFilters } from '@/components/LibraryFilters'

const NAV: { href: string; label: string; exact?: boolean }[] = [
  { href: '/library',    label: 'Library', exact: true },
  { href: '/chat',       label: 'Chat' },
  { href: '/characters', label: 'Characters' },
  { href: '/games',      label: 'Games' },
  { href: '/recommend',  label: 'Recommend' },
  { href: '/bookmarks',  label: 'Bookmarks' },
]

interface HeaderNovel extends NovelLike { genres: string[]; total_chapters: number }

interface SiteHeaderProps {
  /** Extra element rendered before the TokenWidget */
  rightSlot?: React.ReactNode
  /** Override the inner max-width (default max-w-7xl) */
  maxWidth?: string
  /** Extra classes appended to the <header> root (e.g. "shrink-0" for flex layouts) */
  rootClassName?: string
}

export default function SiteHeader({ rightSlot, maxWidth = 'max-w-7xl', rootClassName = '' }: SiteHeaderProps) {
  const pathname = usePathname()
  const router   = useRouter()

  const [query, setQuery]           = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters]       = useState<Filters>(DEFAULT_FILTERS)
  const [novels, setNovels]         = useState<HeaderNovel[]>([])
  const filterRef = useRef<HTMLDivElement>(null)

  // Load novels once (for genre list + live preview count in the filter panel)
  useEffect(() => {
    fetch('/api/novels').then(r => r.json()).then((d: HeaderNovel[] | { novels?: HeaderNovel[] }) => {
      setNovels(Array.isArray(d) ? d : (d.novels ?? []))
    }).catch(() => {})
  }, [])

  const allGenres = useMemo(() => {
    const s = new Set<string>()
    novels.forEach(n => (n.genres ?? []).forEach(g => s.add(g)))
    return [...s].sort()
  }, [novels])

  useEffect(() => {
    function h(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function active(href: string, exact = false) {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  function submitSearch(e?: React.FormEvent) {
    e?.preventDefault()
    const q = query.trim()
    router.push(q ? `/library?q=${encodeURIComponent(q)}` : '/library')
  }

  // Applying filters from the header navigates to the library with the params encoded.
  function applyFilters(f: Filters) {
    setFilters(f)
    const params = filtersToParams(f, query.trim() || undefined)
    router.push(params ? `/library?${params}` : '/library')
  }

  return (
    <header className={`sticky top-0 z-50 border-b border-[var(--nc-border)] bg-[var(--nc-bg)]/90 backdrop-blur ${rootClassName}`}>

      {/* Row 1 — logo · search + filters · token widget */}
      <div className={`mx-auto flex ${maxWidth} items-center gap-3 px-4 py-2.5`}>
        <Link href="/library" className="group shrink-0 flex items-center gap-2.5">
          <img src="/logo.png" alt="" className="h-9 w-9 object-contain" />
          <div className="hidden xs:block sm:block">
            <span className="block text-lg sm:text-xl font-bold tracking-tight text-amber-400 group-hover:text-amber-300 transition leading-none">
              NovelCodex
            </span>
            <span className="hidden lg:block text-[11px] text-zinc-600 leading-none mt-1">
              Every secret, every character, every world
            </span>
          </div>
        </Link>

        {/* Search + Filters — centered, grows to fill */}
        <div className="flex flex-1 max-w-2xl mx-auto items-center gap-2">
          <form onSubmit={submitSearch}
            className="flex flex-1 items-stretch rounded-xl overflow-hidden border border-zinc-700 focus-within:border-amber-500/60 transition">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search novels…"
              className="flex-1 min-w-0 bg-zinc-900 px-3 sm:px-4 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none"
            />
            <button type="submit" aria-label="Search"
              className="shrink-0 bg-amber-500 hover:bg-amber-400 transition px-3 sm:px-4 text-xs font-bold text-black flex items-center">
              <svg className="h-4 w-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" />
              </svg>
              <span className="hidden sm:inline">Search</span>
            </button>
          </form>

          {/* Filters — the SAME panel as the library; applying navigates to /library */}
          <div ref={filterRef} className="relative shrink-0 hidden sm:block">
            <button
              onClick={() => setFilterOpen(o => !o)}
              className={`flex h-full items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
                filterOpen || hasActiveFilters(filters)
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M11 12h2M9 16h6" />
              </svg>
              Filters
            </button>
            {filterOpen && (
              <FilterPanel
                allGenres={allGenres}
                novels={novels}
                filters={filters}
                onChange={applyFilters}
                onClose={() => setFilterOpen(false)}
              />
            )}
          </div>
        </div>

        {/* Right side — token widget (balance when signed in, Login when not) */}
        <div className="shrink-0 flex items-center gap-2">
          {rightSlot}
          <TokenWidget />
        </div>
      </div>

      {/* Row 2 — page navigation (centered). Hidden on phones (bottom tab bar). */}
      <div className="hidden sm:block border-t border-zinc-800/60">
        <div className={`mx-auto flex ${maxWidth} items-center justify-center gap-1 px-4 py-1.5`}>
          {NAV.map(({ href, label, exact }) => {
            const isActive = active(href, exact)
            return (
              <Link
                key={href}
                href={href}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </div>
      </div>
    </header>
  )
}
