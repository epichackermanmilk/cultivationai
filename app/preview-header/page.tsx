'use client'

// ─────────────────────────────────────────────────────────────────────────────
// HEADER PREVIEW — design mockup only, NOT applied to the live site.
// Refined "search-forward" header (Option B) for the Library/desktop view.
// On phones this header does NOT appear — mobile keeps the bottom tab bar,
// so this is a desktop/tablet-only layout.
// Visit /preview-header to view. Delete this file when done evaluating.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react'
import Link        from 'next/link'
import Footer      from '@/components/Footer'

const MOCK_NOVELS = [
  { title: 'Reverend Insanity', author: 'Gu Zhen Ren', genres: ['Xianxia', 'Cultivation'] },
  { title: 'Lord of the Mysteries', author: 'Cuttlefish That Loves Diving', genres: ['Horror', 'Fantasy'] },
  { title: 'The Legendary Mechanic', author: 'Chocolion', genres: ['Sci-Fi', 'Game'] },
  { title: 'A Will Eternal', author: 'Er Gen', genres: ['Xianxia', 'Cultivation'] },
  { title: 'Solo Leveling', author: 'Chugong', genres: ['System', 'Fantasy'] },
  { title: 'Omniscient Reader', author: 'Sing-Shong', genres: ['Regression', 'Fantasy'] },
]

const NAV = ['Library', 'Chat', 'Characters', 'Games', 'Discover', 'Bookmarks']

// Mock of the library's existing Filters panel (genre / status / sort)
const FILTER_GENRES = ['Xianxia', 'Wuxia', 'Cultivation', 'System', 'Regression', 'Murim', 'Fantasy', 'Romance', 'Horror', 'Sci-Fi', 'Isekai', 'Game']

function RefinedHeader({ signedIn = false }: { signedIn?: boolean }) {
  const [query, setQuery]           = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [activeGenres, setActive]   = useState<string[]>(['Xianxia'])
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const toggleGenre = (g: string) =>
    setActive(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])

  return (
    <header className="border-b border-[var(--nc-border)] bg-[var(--nc-bg)]">
      {/* Row 1 — logo (flush far left) · search + filters (centered) · sign-in (flush far right) */}
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/library" className="group shrink-0 flex items-center gap-3">
          <img src="/logo.png" alt="" className="h-10 w-10 object-contain" />
          <div>
            <span className="block text-2xl font-bold tracking-tight text-amber-400 group-hover:text-amber-300 transition leading-none">NovelCodex</span>
            <span className="hidden lg:block text-xs text-zinc-600 leading-none mt-1">Every secret, every character, every world</span>
          </div>
        </Link>

        {/* Search + Filters (the filter the library already has, kept intact) — centered */}
        <div className="flex flex-1 max-w-2xl mx-auto items-center gap-2">
          <div className="flex flex-1 items-stretch rounded-xl overflow-hidden border border-zinc-700 focus-within:border-amber-500/60 transition">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by title, author, or genre…"
              className="flex-1 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none"
            />
            <button className="shrink-0 bg-amber-500 hover:bg-amber-400 transition px-4 text-xs font-bold text-black">
              Search
            </button>
          </div>

          {/* Filters button — opens the same genre/status/sort panel the library uses */}
          <div ref={filterRef} className="relative shrink-0">
            <button
              onClick={() => setFilterOpen(o => !o)}
              className={`flex h-full items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
                filterOpen || activeGenres.length > 0
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M11 12h2M9 16h6" />
              </svg>
              Filters
              {activeGenres.length > 0 && (
                <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] text-black font-bold">{activeGenres.length}</span>
              )}
            </button>

            {filterOpen && (
              <div className="absolute z-50 top-full right-0 mt-1.5 w-64 rounded-xl border border-[var(--nc-border)] shadow-2xl overflow-hidden p-3"
                style={{ background: 'var(--nc-bg2)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Genre</p>
                <div className="flex flex-wrap gap-1.5">
                  {FILTER_GENRES.map(g => (
                    <button key={g} onClick={() => toggleGenre(g)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition ${
                        activeGenres.includes(g)
                          ? 'border-amber-500/60 bg-amber-500/15 text-amber-400'
                          : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                      }`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sign-in / token box — sized to match the Filters button, pushed far right.
            In production this is the live TokenWidget: token balance + buy button
            when signed in, Login / Register when signed out. */}
        {signedIn ? (
          <div className="shrink-0 flex items-center gap-2">
            {/* Token balance pill */}
            <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-sm font-bold text-amber-400">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              1,240
            </div>
            {/* Buy / account */}
            <button className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-300 hover:border-amber-500/50 hover:text-amber-400 transition">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
              </svg>
              <span className="hidden sm:inline">Account</span>
            </button>
          </div>
        ) : (
          <button className="shrink-0 flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-medium text-zinc-300 hover:border-amber-500/50 hover:text-amber-400 transition">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
            </svg>
            Login / Register
          </button>
        )}
      </div>

      {/* Row 2 — page navigation (centered, no genre dropdown) */}
      <div className="border-t border-zinc-800/60">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-1 px-4 py-1.5">
          {NAV.map((label, i) => (
            <button key={label}
              className={`shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition whitespace-nowrap ${
                i === 0 ? 'bg-amber-500/10 text-amber-400' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}

export default function HeaderPreviewPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>

      {/* Preview banner */}
      <div className="border-b border-amber-500/20 bg-amber-500/5 px-4 py-2 text-center text-xs text-amber-400">
        🎨 <strong>Header Design Preview (Option B, refined)</strong> — Evaluation only. Not live. Desktop/tablet layout — phones keep the bottom tab bar.
      </div>

      {/* Signed-OUT state */}
      <p className="mx-auto max-w-7xl w-full px-4 pt-4 pb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Signed out</p>
      <RefinedHeader />

      {/* Signed-IN state */}
      <p className="mx-auto max-w-7xl w-full px-4 pt-6 pb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Signed in (token balance + account)</p>
      <RefinedHeader signedIn />

      {/* Notes */}
      <div className="mx-auto max-w-4xl px-4 py-6 w-full">
        <div className="rounded-2xl border border-zinc-800 p-5 mb-6" style={{ background: 'var(--nc-bg2)' }}>
          <p className="text-sm font-bold text-amber-400 mb-2">What changed from the first draft</p>
          <ul className="text-xs leading-relaxed space-y-1.5" style={{ color: 'var(--nc-text2)' }}>
            <li>✓ <strong className="text-zinc-300">Sign-in box</strong> — far right, sized to match the Filters button. Shown here as &ldquo;Login / Register&rdquo;; in production this is the live <code>TokenWidget</code> — it shows your token balance + shop when signed in, this box when signed out. So the token count IS accounted for.</li>
            <li>✓ <strong className="text-zinc-300">Bigger logo, flush far left</strong> — NovelCodex + icon enlarged and pushed all the way left; sign-in box all the way right.</li>
            <li>✓ <strong className="text-zinc-300">Filters kept</strong> — the library&apos;s existing genre/status/sort panel now lives next to the search bar.</li>
            <li>✓ <strong className="text-zinc-300">Browse-Genre dropdown removed</strong> — redundant with Filters.</li>
            <li>✓ <strong className="text-zinc-300">Mobile unaffected</strong> — this header is hidden on phones; the bottom tab bar handles mobile navigation.</li>
          </ul>
        </div>

        {/* Mock cards for context */}
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-600">Mock library grid (for layout context)</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {MOCK_NOVELS.map(n => (
            <div key={n.title} className="rounded-xl border border-zinc-800 p-4" style={{ background: 'var(--nc-bg2)' }}>
              <div className="aspect-[3/4] w-full rounded-lg bg-zinc-800 mb-3 flex items-center justify-center">
                <span className="text-2xl opacity-30">📖</span>
              </div>
              <p className="text-xs font-bold text-zinc-200 leading-tight">{n.title}</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">{n.author}</p>
              <div className="mt-2 flex gap-1 flex-wrap">
                {n.genres.map(g => (
                  <span key={g} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-amber-400">{g}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* ── Footer comparison ─────────────────────────────────────────── */}
        <div className="mt-12">
          <p className="mb-1 text-sm font-bold text-amber-400">Footer comparison</p>
          <p className="mb-5 text-xs" style={{ color: 'var(--nc-text2)' }}>
            Two layouts to compare. Both put NovelCodex flush far-left.
          </p>

          {/* Variant A — brand left, links left (inline row, all left-aligned) */}
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Option A — links inline, all left-aligned</p>
          <footer className="mb-8 rounded-xl border border-zinc-800 px-4 py-6"
            style={{ background: 'var(--nc-bg2)' }}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
              <div className="flex items-center gap-2.5 shrink-0">
                <img src="/logo.png" alt="" className="h-6 w-6 object-contain opacity-70" />
                <span className="text-xs font-semibold text-zinc-500">© 2026 NovelCodex</span>
              </div>
              <nav className="flex flex-wrap gap-x-5 gap-y-2 text-xs" style={{ color: 'var(--nc-text2)' }}>
                {['About', 'Support', 'Privacy', 'Terms', 'Contact'].map(l => (
                  <span key={l} className="hover:text-amber-400 transition cursor-pointer">{l}</span>
                ))}
              </nav>
            </div>
          </footer>

          {/* Variant B — links stacked underneath the brand */}
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Option B — links underneath NovelCodex</p>
          <footer className="rounded-xl border border-zinc-800 px-4 py-6"
            style={{ background: 'var(--nc-bg2)' }}>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="" className="h-7 w-7 object-contain opacity-80" />
                <span className="text-sm font-bold text-amber-400">NovelCodex</span>
              </div>
              <nav className="flex flex-wrap gap-x-5 gap-y-2 text-xs" style={{ color: 'var(--nc-text2)' }}>
                {['About', 'Support', 'Privacy', 'Terms', 'Contact'].map(l => (
                  <span key={l} className="hover:text-amber-400 transition cursor-pointer">{l}</span>
                ))}
              </nav>
              <span className="text-[11px] text-zinc-600">© 2026 NovelCodex. All rights reserved.</span>
            </div>
          </footer>
        </div>
      </div>

      {/* The current live footer, for reference */}
      <p className="mx-auto max-w-4xl px-4 text-[10px] font-bold uppercase tracking-widest text-zinc-600">↓ Current live footer (for reference)</p>
      <Footer />
    </div>
  )
}
