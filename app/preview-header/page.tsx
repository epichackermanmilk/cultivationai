'use client'

// ─────────────────────────────────────────────────────────────────────────────
// HEADER PREVIEW — design mockup only, NOT applied to the live site.
// Shows what a search-bar + browse-by-genre style header would look like
// on NovelCodex. Inspired by the Toofan header layout.
// Visit /preview-header to view. Delete this file when done evaluating.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Footer from '@/components/Footer'
import TokenWidget from '@/components/TokenWidget'

const GENRES = [
  'Xianxia', 'Wuxia', 'Cultivation', 'System',
  'Regression', 'Murim', 'Fantasy', 'Romance',
  'Horror', 'Sci-Fi', 'Isekai', 'Game',
]

const MOCK_NOVELS = [
  { title: 'Reverend Insanity', author: 'Gu Zhen Ren', genres: ['Xianxia', 'Cultivation'] },
  { title: 'Lord of the Mysteries', author: 'Cuttlefish That Loves Diving', genres: ['Horror', 'Fantasy'] },
  { title: 'The Legendary Mechanic', author: 'Chocolion', genres: ['Sci-Fi', 'Game'] },
  { title: 'A Will Eternal', author: 'Er Gen', genres: ['Xianxia', 'Cultivation'] },
  { title: 'Solo Leveling', author: 'Chugong', genres: ['System', 'Fantasy'] },
  { title: 'Omniscient Reader', author: 'Sing-Shong', genres: ['Regression', 'Fantasy'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// OPTION A — Full-width search bar header (closest to Toofan's layout)
// ─────────────────────────────────────────────────────────────────────────────
function HeaderOptionA() {
  const [genreOpen, setGenreOpen] = useState(false)
  const [query, setQuery] = useState('')
  const genreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) {
      if (genreRef.current && !genreRef.current.contains(e.target as Node)) setGenreOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <header className="border-b border-[var(--nc-border)] bg-[var(--nc-bg)]">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        {/* Logo */}
        <Link href="/library" className="group shrink-0 flex items-center gap-2.5 mr-2">
          <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
          <span className="text-lg font-bold tracking-tight text-amber-400 group-hover:text-amber-300 transition whitespace-nowrap">
            NovelCodex
          </span>
        </Link>

        {/* Genre dropdown */}
        <div ref={genreRef} className="relative shrink-0">
          <button
            onClick={() => setGenreOpen(o => !o)}
            className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs font-semibold text-amber-400/80 hover:border-amber-500/50 hover:text-amber-400 transition whitespace-nowrap"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Browse by Genre
            <svg className={`h-3 w-3 transition-transform ${genreOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 10 6">
              <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {genreOpen && (
            <div className="absolute z-50 top-full left-0 mt-1.5 w-52 rounded-xl border border-[var(--nc-border)] shadow-2xl overflow-hidden"
              style={{ background: 'var(--nc-bg2)' }}>
              <div className="p-2">
                {GENRES.map(g => (
                  <button key={g} onMouseDown={() => setGenreOpen(false)}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-zinc-300 hover:bg-amber-500/10 hover:text-amber-400 transition">
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search bar */}
        <div className="flex flex-1 items-stretch rounded-xl overflow-hidden border border-zinc-700 focus-within:border-amber-500/60 transition">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search novels, characters, authors…"
            className="flex-1 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none"
          />
          <button className="shrink-0 bg-amber-500 hover:bg-amber-400 transition px-5 text-sm font-bold text-black">
            Search
          </button>
        </div>

        {/* Right side */}
        <div className="shrink-0 flex items-center gap-2">
          <TokenWidget />
        </div>
      </div>

      {/* Sub-nav */}
      <div className="border-t border-zinc-800">
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 py-1.5 overflow-x-auto scrollbar-none">
          {['Library', '✦ Chat', '🎭 Characters', '🎮 Games', 'Discover', 'Bookmarks'].map(label => (
            <button key={label}
              className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition whitespace-nowrap">
              {label}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// OPTION B — Search bar integrated directly in the single header row
// (Current nav links move under; cleaner for content-heavy views)
// ─────────────────────────────────────────────────────────────────────────────
function HeaderOptionB() {
  const [query, setQuery] = useState('')
  const [genreOpen, setGenreOpen] = useState(false)
  const genreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) {
      if (genreRef.current && !genreRef.current.contains(e.target as Node)) setGenreOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <header className="border-b border-[var(--nc-border)] bg-[var(--nc-bg)]">
      {/* Top row */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5">
        <Link href="/library" className="group shrink-0 flex items-center gap-2.5">
          <img src="/logo.png" alt="" className="h-7 w-7 object-contain" />
          <div>
            <span className="block text-base font-bold tracking-tight text-amber-400 group-hover:text-amber-300 transition">NovelCodex</span>
            <span className="hidden lg:block text-[10px] text-zinc-600 leading-none">Every secret, every character, every world</span>
          </div>
        </Link>

        {/* Search — takes remaining space */}
        <div className="flex flex-1 max-w-xl items-stretch rounded-xl overflow-hidden border border-zinc-700 focus-within:border-amber-500/60 transition">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search novels, characters, authors…"
            className="flex-1 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none"
          />
          <button className="shrink-0 bg-amber-500 hover:bg-amber-400 transition px-4 text-xs font-bold text-black">
            Search
          </button>
        </div>

        <TokenWidget />
      </div>

      {/* Bottom row — genre browse + page links */}
      <div className="border-t border-zinc-800/60">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-1.5">
          {/* Genre dropdown */}
          <div ref={genreRef} className="relative">
            <button onClick={() => setGenreOpen(o => !o)}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-amber-400/80 hover:bg-amber-500/10 hover:text-amber-400 transition border border-amber-500/20 hover:border-amber-500/40 whitespace-nowrap">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h7" />
              </svg>
              Browse Genres
              <svg className={`h-2.5 w-2.5 transition-transform ${genreOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 10 6">
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            {genreOpen && (
              <div className="absolute z-50 top-full left-0 mt-1 w-44 rounded-xl border border-[var(--nc-border)] shadow-xl overflow-hidden"
                style={{ background: 'var(--nc-bg2)' }}>
                <div className="p-1.5 grid grid-cols-2 gap-0.5">
                  {GENRES.map(g => (
                    <button key={g} onMouseDown={() => setGenreOpen(false)}
                      className="text-left px-2 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-amber-500/10 hover:text-amber-400 transition">
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="h-3 w-px bg-zinc-700 mx-1" />

          {['Library', '✦ Chat', '🎭 Characters', '🎮 Games', 'Discover', 'Bookmarks'].map(label => (
            <button key={label}
              className="shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition whitespace-nowrap">
              {label}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview page
// ─────────────────────────────────────────────────────────────────────────────
export default function HeaderPreviewPage() {
  const [active, setActive] = useState<'A' | 'B'>('A')

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>

      {/* Preview switcher banner */}
      <div className="border-b border-amber-500/20 bg-amber-500/5 px-4 py-2 text-center text-xs text-amber-400">
        🎨 <strong>Header Design Preview</strong> — This page is for evaluation only. Not live on the site.
        <span className="ml-4">
          <button onClick={() => setActive('A')} className={`mx-1 underline ${active === 'A' ? 'text-amber-400 font-bold no-underline' : ''}`}>Option A</button>
          |
          <button onClick={() => setActive('B')} className={`mx-1 underline ${active === 'B' ? 'text-amber-400 font-bold no-underline' : ''}`}>Option B</button>
        </span>
      </div>

      {/* Selected header */}
      {active === 'A' ? <HeaderOptionA /> : <HeaderOptionB />}

      {/* Description */}
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="rounded-2xl border border-zinc-800 p-5 mb-6" style={{ background: 'var(--nc-bg2)' }}>
          {active === 'A' ? (
            <div>
              <p className="text-sm font-bold text-amber-400 mb-2">Option A — Two-row header with prominent search</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
                Row 1: Logo · Browse by Genre dropdown · Full-width search bar · TokenWidget<br/>
                Row 2: Page navigation links (Library, Chat, Characters, Games, etc.)<br/><br/>
                <strong className="text-zinc-300">Pros:</strong> Search is very prominent, feels like a discovery platform. Genre browsing front-and-centre.<br/>
                <strong className="text-zinc-300">Cons:</strong> Two rows takes more vertical space, especially on mobile.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-bold text-amber-400 mb-2">Option B — Compact two-row with inline search</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
                Row 1: Logo · Search bar (centered, takes flex-1) · TokenWidget<br/>
                Row 2: Browse Genres dropdown · Page navigation links<br/><br/>
                <strong className="text-zinc-300">Pros:</strong> More compact, search always visible, logo stays prominent.<br/>
                <strong className="text-zinc-300">Cons:</strong> Still two rows; genre links are small in the sub-nav.
              </p>
            </div>
          )}
        </div>

        {/* Mock content below header */}
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-600">Mock novel cards below (to show layout context)</p>
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
      </div>

      <div className="mx-auto max-w-4xl px-4 pb-8">
        <div className="rounded-xl border border-zinc-800 p-4 text-xs" style={{ background: 'var(--nc-bg2)', color: 'var(--nc-text2)' }}>
          <p className="font-semibold text-zinc-300 mb-2">Recommendation:</p>
          <p>Option B is lighter and keeps the single-bar feel of the current design. Option A is closer to the Toofan style you referenced — more store-like, great if you want search to be the primary interaction on the library.
          Either way, I&apos;d suggest <strong className="text-zinc-200">only adding the search bar to the library page header</strong> — not every page.
          The current header works well for game/legal/profile pages; search is specifically valuable on the library.</p>
        </div>
      </div>

      <Footer />
    </div>
  )
}
