'use client'

// /browse — the full catalogue with theme/genre filtering (the redesigned
// successor to /library). AsuraScans "Browse Series" toolbar: an independent live
// search, a sort dropdown, a 2-column genre tag picker, and a chapters min/max
// popover — all uniform pill controls — over a responsive poster grid. Reuses
// /api/novels/all.

import { Suspense, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { matchesSearch } from '@/lib/search'
import TestHeader from '@/components/TestHeader'
import { TestStyles, Cover, Skeleton, type Novel } from '@/components/TestUI'
import { trackNovelClick } from '@/lib/analytics'

type Sort = 'latest' | 'popular' | 'rating' | 'az' | 'newest'
const SORTS: [Sort, string][] = [
  ['latest', 'Latest Update'], ['popular', 'Popular'], ['rating', 'Rating'], ['az', 'A–Z'], ['newest', 'Newest'],
]
const PAGE = 30

// Shared trigger-button look so every control is the same size.
const TRIGGER = 'flex h-10 items-center justify-between gap-2 rounded-xl border px-4 text-sm font-medium transition'

function Chevron({ open }: { open: boolean }) {
  return <svg className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
}

function useClickOutside(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [onClose])
  return ref
}

// ── Sort dropdown ─────────────────────────────────────────────────────────────────
function SortFilter({ value, onChange }: { value: Sort; onChange: (s: Sort) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside(() => setOpen(false))
  const label = SORTS.find(s => s[0] === value)![1]
  const active = value !== 'latest'
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={`${TRIGGER} w-44 ${open || active ? 'border-[rgba(var(--v),0.6)] bg-[rgba(var(--v),0.12)] text-white' : 'border-white/10 bg-white/5 text-white/75 hover:text-white'}`}>
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M3 6h13M3 12h9M3 18h5M17 6l4 4-4 4" /></svg>
          {label}
        </span>
        <Chevron open={open} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-white/10 bg-[#100d1c] shadow-2xl">
          {SORTS.map(([v, l]) => (
            <button key={v} onClick={() => { onChange(v); setOpen(false) }}
              className={`block w-full px-4 py-2.5 text-left text-sm transition hover:bg-white/5 ${v === value ? 'text-[rgb(var(--v))]' : 'text-white/80'}`}>{l}</button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Genre tag picker (2-column, searchable) ─────────────────────────────────────────
function GenreFilter({ allGenres, selected, mode, onToggle, onMode, onClear }: {
  allGenres: string[]; selected: string[]; mode: 'OR' | 'AND'
  onToggle: (g: string) => void; onMode: (m: 'OR' | 'AND') => void; onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useClickOutside(() => setOpen(false))
  const visible = allGenres.filter(g => g.toLowerCase().includes(search.toLowerCase()))
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={`${TRIGGER} w-44 ${open || selected.length ? 'border-[rgba(var(--v),0.6)] bg-[rgba(var(--v),0.12)] text-white' : 'border-white/10 bg-white/5 text-white/75 hover:text-white'}`}>
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M3 5a2 2 0 012-2h5l9 9-7 7-9-9V5z" /></svg>
          Genres {selected.length > 0 && <span className="rounded-full bg-[rgb(var(--v))] px-1.5 text-xs font-bold text-white">{selected.length}</span>}
        </span>
        <Chevron open={open} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[26rem] max-w-[90vw] overflow-hidden rounded-2xl border border-white/10 bg-[#100d1c] shadow-2xl">
          <div className="border-b border-white/10 p-2.5">
            <div className="relative">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" strokeLinecap="round" /></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search genres"
                className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-9 pr-3 text-sm text-white placeholder-white/35 outline-none focus:border-[rgba(var(--v),0.5)]" />
            </div>
          </div>
          <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto p-2.5">
            {visible.length === 0 && <p className="col-span-2 py-3 text-center text-xs text-white/40">No genres match</p>}
            {visible.map(g => {
              const on = selected.includes(g)
              return (
                <button key={g} onClick={() => onToggle(g)}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-[13px] font-semibold transition ${on ? 'border-[rgba(var(--v),0.6)] bg-[rgba(var(--v),0.12)] text-white' : 'border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20 hover:text-white'}`}>
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${on ? 'border-[rgb(var(--v))] bg-[rgb(var(--v))]' : 'border-white/25'}`}>
                    {on && <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </span>
                  <span className="truncate">{g}</span>
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2 border-t border-white/10 p-2.5">
            <span className="text-xs text-white/40">Match</span>
            <div className="flex overflow-hidden rounded-lg border border-white/10 text-xs">
              {(['OR', 'AND'] as const).map(m => (
                <button key={m} onClick={() => onMode(m)} className={`px-3 py-1 font-medium transition ${mode === m ? 'bg-[rgb(var(--v))] text-white' : 'text-white/50 hover:text-white'}`}>{m}</button>
              ))}
            </div>
            {selected.length > 0 && <button onClick={onClear} className="ml-auto text-xs text-white/45 hover:text-white">Clear ({selected.length})</button>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Chapters min/max popover ────────────────────────────────────────────────────────
function ChaptersFilter({ min, max, onApply }: { min: number; max: number; onApply: (min: number, max: number) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside(() => setOpen(false))
  const [lo, setLo] = useState(String(min || ''))
  const [hi, setHi] = useState(String(max || ''))
  useEffect(() => { setLo(String(min || '')); setHi(String(max || '')) }, [min, max])
  const active = min > 0 || max > 0
  const apply = () => { onApply(Math.max(0, parseInt(lo, 10) || 0), Math.max(0, parseInt(hi, 10) || 0)); setOpen(false) }
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={`${TRIGGER} w-44 ${open || active ? 'border-[rgba(var(--v),0.6)] bg-[rgba(var(--v),0.12)] text-white' : 'border-white/10 bg-white/5 text-white/75 hover:text-white'}`}>
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" /></svg>
          {active ? `${min || 0}–${max || '∞'} ch` : 'Chapters'}
        </span>
        <Chevron open={open} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-2xl border border-white/10 bg-[#100d1c] p-3 shadow-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">Chapter count</p>
          <div className="flex items-center gap-2">
            <input type="number" min={0} value={lo} onChange={e => setLo(e.target.value)} onKeyDown={e => e.key === 'Enter' && apply()}
              placeholder="Min" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-center text-sm text-white placeholder-white/35 outline-none focus:border-[rgba(var(--v),0.5)]" />
            <span className="text-white/35">–</span>
            <input type="number" min={0} value={hi} onChange={e => setHi(e.target.value)} onKeyDown={e => e.key === 'Enter' && apply()}
              placeholder="Max" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-center text-sm text-white placeholder-white/35 outline-none focus:border-[rgba(var(--v),0.5)]" />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => { setLo(''); setHi(''); onApply(0, 0); setOpen(false) }} className="flex-1 rounded-lg border border-white/10 py-2 text-xs font-medium text-white/60 transition hover:text-white">Clear</button>
            <button onClick={apply} className="flex-1 rounded-lg py-2 text-xs font-bold text-white transition hover:brightness-110" style={{ background: 'rgb(var(--v))' }}>Apply</button>
          </div>
        </div>
      )}
    </div>
  )
}

function NovelCard({ n }: { n: Novel }) {
  // Every scraped novel is readable now (reading is free; only the latest chapters
  // lock behind a sub/tokens), so the whole catalogue is clickable.
  return (
    <Link href={`/novel/${n.slug}`} onClick={() => trackNovelClick(n.slug, 'browse')} className="group tnl-sheen block">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl ring-1 ring-white/10 transition group-hover:ring-[rgba(var(--v),0.6)]">
        <Cover novel={n} className="h-full w-full" />
        <span className="absolute bottom-1.5 right-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white/85">{(n.total_chapters || 0).toLocaleString()} ch</span>
      </div>
      <p className="mt-1.5 line-clamp-2 text-[13px] font-semibold leading-tight">{n.title}</p>
      {n.genres?.[0] && <p className="mt-0.5 truncate text-[11px]" style={{ color: 'rgb(var(--v))' }}>{n.genres[0]}</p>}
    </Link>
  )
}

function BrowseInner() {
  const sp = useSearchParams()
  const [novels, setNovels] = useState<Novel[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [genres, setGenres] = useState<string[]>([])
  const [mode, setMode] = useState<'OR' | 'AND'>('OR')
  const [minCh, setMinCh] = useState(0)
  const [maxCh, setMaxCh] = useState(0)
  const [sort, setSort] = useState<Sort>('latest')
  const [visible, setVisible] = useState(PAGE)
  const sentinel = useRef<HTMLDivElement>(null)

  // Seed the independent search from the header's ?q= (then it's locally editable).
  useEffect(() => { setQuery(sp.get('q') ?? '') }, [sp])

  useEffect(() => {
    fetch('/api/novels/all').then(r => r.json()).then((d: Novel[]) => { setNovels(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  useEffect(() => { setVisible(PAGE) }, [query, genres, mode, minCh, maxCh, sort])

  const allGenres = useMemo(() => {
    const s = new Set<string>(); novels.forEach(n => (n.genres ?? []).forEach(g => s.add(g))); return [...s].sort()
  }, [novels])

  const filtered = useMemo(() => {
    let list = novels
    if (query.trim()) list = list.filter(n => matchesSearch(n.title, query) || matchesSearch(n.author || '', query))
    if (genres.length) list = list.filter(n => mode === 'OR' ? genres.some(g => n.genres?.includes(g)) : genres.every(g => n.genres?.includes(g)))
    if (minCh > 0) list = list.filter(n => (n.total_chapters || 0) >= minCh)
    if (maxCh > 0) list = list.filter(n => (n.total_chapters || 0) <= maxCh)
    const arr = [...list]
    // Real recency/rating metrics arrive with the finalized backend; until then
    // latest/popular/rating proxy by chapter count, A–Z by title, newest by reverse.
    if (sort === 'az') arr.sort((a, b) => a.title.localeCompare(b.title))
    else if (sort === 'newest') arr.reverse()
    else arr.sort((a, b) => (b.total_chapters || 0) - (a.total_chapters || 0))
    const rank = (n: Novel) => (n.locked ? 2 : n.coming_soon ? 1 : 0)
    arr.sort((a, b) => rank(a) - rank(b))
    return arr
  }, [novels, query, genres, mode, minCh, maxCh, sort])

  const loadMore = useCallback(() => setVisible(v => Math.min(v + PAGE, filtered.length)), [filtered.length])
  useEffect(() => {
    const el = sentinel.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) loadMore() }, { rootMargin: '600px' })
    obs.observe(el); return () => obs.disconnect()
  }, [loadMore])

  const shown = filtered.slice(0, visible)
  const anyActive = genres.length > 0 || minCh > 0 || maxCh > 0 || sort !== 'latest' || !!query

  return (
    <div className="tnl-root relative min-h-screen text-white" style={{ ['--v' as string]: '124,58,237' }}>
      <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: '#07060d' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(90% 50% at 50% -10%, rgba(var(--v),0.18) 0%, transparent 55%)' }} />
      </div>

      <TestHeader />

      <main className="relative z-10 mx-auto max-w-[1400px] px-4 pb-24 pt-6 sm:px-6">
        {/* Toolbar — elevated above the grid so dropdowns are never hidden by covers. */}
        <div className="tnl-panel relative z-30 mb-6 p-4">
          <div className="mb-3 flex items-center gap-2">
            <h1 className="text-lg font-extrabold tracking-tight">Browse Series</h1>
            <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/70">{loading ? '…' : filtered.length}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Independent live search */}
            <div className="relative w-56">
              <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" strokeLinecap="round" /></svg>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter by title or author…"
                className="h-10 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 text-sm text-white placeholder-white/40 outline-none transition focus:border-[rgba(var(--v),0.6)]" />
            </div>
            <SortFilter value={sort} onChange={setSort} />
            <GenreFilter allGenres={allGenres} selected={genres} mode={mode}
              onToggle={g => setGenres(s => s.includes(g) ? s.filter(x => x !== g) : [...s, g])}
              onMode={setMode} onClear={() => setGenres([])} />
            <ChaptersFilter min={minCh} max={maxCh} onApply={(lo, hi) => { setMinCh(lo); setMaxCh(hi) }} />
            {anyActive && (
              <button onClick={() => { setGenres([]); setMinCh(0); setMaxCh(0); setSort('latest'); setQuery('') }}
                className="ml-auto h-10 rounded-xl px-3 text-sm text-white/55 transition hover:text-white">Reset</button>
            )}
          </div>
        </div>

        {/* Grid — kept on its own (lower) stacking layer. */}
        <div className="relative z-0">
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 18 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {shown.map(n => <NovelCard key={n.slug} n={n} />)}
              </div>
              {filtered.length === 0 && <p className="py-24 text-center text-white/40">No novels match your filters.</p>}
              <div ref={sentinel} className="h-1" />
              {visible < filtered.length && (
                <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[rgb(var(--v))] border-t-transparent" /></div>
              )}
            </>
          )}
        </div>
      </main>

      <TestStyles />
    </div>
  )
}

export default function TestBrowsePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#07060d' }} />}>
      <BrowseInner />
    </Suspense>
  )
}
