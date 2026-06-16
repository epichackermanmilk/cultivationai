'use client'

// /testbrowse — the full catalogue with theme/genre filtering (the redesigned
// successor to /library). AsuraScans "Browse Series" layout: a filter toolbar with
// a searchable genre checklist, sort + minimum-chapters controls, over a responsive
// poster grid. Live novels link to the redesigned detail page; locked/coming-soon
// titles render behind a lock barrier. Reuses /api/novels/all.

import { Suspense, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { matchesSearch } from '@/lib/search'
import TestHeader from '@/components/TestHeader'
import { TestStyles, Cover, Skeleton, type Novel } from '@/components/TestUI'

type Sort = 'latest' | 'most' | 'fewest' | 'az'
const PAGE = 30

function Chevron({ open }: { open: boolean }) {
  return <svg className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
}

// ── Genre checklist popover ───────────────────────────────────────────────────────
function GenreFilter({ allGenres, selected, mode, onToggle, onMode, onClear }: {
  allGenres: string[]; selected: string[]; mode: 'OR' | 'AND'
  onToggle: (g: string) => void; onMode: (m: 'OR' | 'AND') => void; onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])
  const visible = allGenres.filter(g => g.toLowerCase().includes(search.toLowerCase()))
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
          open || selected.length ? 'border-[rgba(var(--v),0.6)] bg-[rgba(var(--v),0.12)] text-white' : 'border-white/10 bg-white/5 text-white/70 hover:text-white'
        }`}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M3 4h18M7 8h10M11 12h2M9 16h6" /></svg>
        Genres {selected.length > 0 && <span className="rounded-full bg-[rgb(var(--v))] px-1.5 text-xs font-bold text-white">{selected.length}</span>}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#100d1c] shadow-2xl">
          <div className="border-b border-white/10 p-2">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search genres"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-white/35 outline-none focus:border-[rgba(var(--v),0.5)]" />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {visible.length === 0 && <p className="px-3 py-3 text-center text-xs text-white/40">No genres match</p>}
            {visible.map(g => {
              const on = selected.includes(g)
              return (
                <button key={g} onClick={() => onToggle(g)} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-white/80 transition hover:bg-white/5">
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${on ? 'border-[rgb(var(--v))] bg-[rgb(var(--v))]' : 'border-white/25'}`}>
                    {on && <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </span>
                  {g}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2 border-t border-white/10 p-2">
            <span className="text-xs text-white/40">Match</span>
            <div className="flex overflow-hidden rounded-lg border border-white/10 text-xs">
              {(['OR', 'AND'] as const).map(m => (
                <button key={m} onClick={() => onMode(m)} className={`px-2.5 py-1 font-medium transition ${mode === m ? 'bg-[rgb(var(--v))] text-white' : 'text-white/50 hover:text-white'}`}>{m}</button>
              ))}
            </div>
            {selected.length > 0 && <button onClick={onClear} className="ml-auto text-xs text-white/45 hover:text-white">Clear</button>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sort dropdown ─────────────────────────────────────────────────────────────────
function SortFilter({ value, onChange }: { value: Sort; onChange: (s: Sort) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])
  const opts: [Sort, string][] = [['latest', 'Most popular'], ['most', '↓ Most chapters'], ['fewest', '↑ Fewest chapters'], ['az', 'A → Z']]
  const label = opts.find(o => o[0] === value)![1]
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-medium text-white/80 transition hover:text-white">
        {label} <Chevron open={open} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 w-48 overflow-hidden rounded-2xl border border-white/10 bg-[#100d1c] shadow-2xl">
          {opts.map(([v, l]) => (
            <button key={v} onClick={() => { onChange(v); setOpen(false) }}
              className={`block w-full px-3.5 py-2.5 text-left text-sm transition hover:bg-white/5 ${v === value ? 'text-[rgb(var(--v))]' : 'text-white/80'}`}>{l}</button>
          ))}
        </div>
      )}
    </div>
  )
}

function NovelCard({ n }: { n: Novel }) {
  const blocked = n.locked || n.coming_soon
  const inner = (
    <div className={`group ${blocked ? '' : 'tnl-sheen'}`}>
      <div className={`relative aspect-[3/4] overflow-hidden rounded-xl ring-1 ring-white/10 transition ${blocked ? '' : 'group-hover:ring-[rgba(var(--v),0.6)]'}`}>
        <Cover novel={n} className="h-full w-full" />
        {blocked ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/45 backdrop-blur-[1px]">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-white/85" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" strokeLinecap="round" /></svg>
            <span className="rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white/90">{n.coming_soon ? 'Coming Soon' : 'Locked'}</span>
          </div>
        ) : (
          <span className="absolute bottom-1.5 right-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white/85">{(n.total_chapters || 0).toLocaleString()} ch</span>
        )}
      </div>
      <p className="mt-1.5 line-clamp-2 text-[13px] font-semibold leading-tight">{n.title}</p>
      {n.genres?.[0] && <p className="mt-0.5 truncate text-[11px]" style={{ color: 'rgb(var(--v))' }}>{n.genres[0]}</p>}
    </div>
  )
  if (blocked) return <div className="cursor-default select-none">{inner}</div>
  return <Link href={`/testnewlibrary/${n.slug}`}>{inner}</Link>
}

function BrowseInner() {
  const sp = useSearchParams()
  const [novels, setNovels] = useState<Novel[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [genres, setGenres] = useState<string[]>([])
  const [mode, setMode] = useState<'OR' | 'AND'>('OR')
  const [minCh, setMinCh] = useState(0)
  const [sort, setSort] = useState<Sort>('latest')
  const [visible, setVisible] = useState(PAGE)
  const sentinel = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(sp.get('q') ?? '') }, [sp])

  useEffect(() => {
    fetch('/api/novels/all').then(r => r.json()).then((d: Novel[]) => { setNovels(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  useEffect(() => { setVisible(PAGE) }, [query, genres, mode, minCh, sort])

  const allGenres = useMemo(() => {
    const s = new Set<string>(); novels.forEach(n => (n.genres ?? []).forEach(g => s.add(g))); return [...s].sort()
  }, [novels])

  const filtered = useMemo(() => {
    let list = novels
    if (query.trim()) list = list.filter(n => matchesSearch(n.title, query))
    if (genres.length) list = list.filter(n => mode === 'OR' ? genres.some(g => n.genres?.includes(g)) : genres.every(g => n.genres?.includes(g)))
    if (minCh > 0) list = list.filter(n => (n.total_chapters || 0) >= minCh)
    const arr = [...list]
    if (sort === 'most' || sort === 'latest') arr.sort((a, b) => (b.total_chapters || 0) - (a.total_chapters || 0))
    else if (sort === 'fewest') arr.sort((a, b) => (a.total_chapters || 0) - (b.total_chapters || 0))
    else arr.sort((a, b) => a.title.localeCompare(b.title))
    // Live first, then coming-soon, then locked
    const rank = (n: Novel) => (n.locked ? 2 : n.coming_soon ? 1 : 0)
    arr.sort((a, b) => rank(a) - rank(b))
    return arr
  }, [novels, query, genres, mode, minCh, sort])

  const loadMore = useCallback(() => setVisible(v => Math.min(v + PAGE, filtered.length)), [filtered.length])
  useEffect(() => {
    const el = sentinel.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) loadMore() }, { rootMargin: '600px' })
    obs.observe(el); return () => obs.disconnect()
  }, [loadMore])

  const shown = filtered.slice(0, visible)

  return (
    <div className="tnl-root relative min-h-screen text-white" style={{ ['--v' as string]: '124,58,237' }}>
      <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: '#07060d' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(90% 50% at 50% -10%, rgba(var(--v),0.18) 0%, transparent 55%)' }} />
      </div>

      <TestHeader />

      <main className="relative z-10 mx-auto max-w-[1400px] px-4 pb-24 pt-6 sm:px-6">
        <div className="tnl-panel mb-6 p-4">
          <div className="mb-3 flex items-center gap-2">
            <h1 className="text-lg font-extrabold tracking-tight">Browse Series</h1>
            <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/70">{loading ? '…' : filtered.length}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SortFilter value={sort} onChange={setSort} />
            <GenreFilter allGenres={allGenres} selected={genres} mode={mode}
              onToggle={g => setGenres(s => s.includes(g) ? s.filter(x => x !== g) : [...s, g])}
              onMode={setMode} onClear={() => setGenres([])} />
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white/70">
              Min chapters
              <input type="number" min={0} value={minCh || ''} onChange={e => setMinCh(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0" className="w-20 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-center text-sm text-white outline-none focus:border-[rgba(var(--v),0.5)]" />
            </label>
            {(genres.length > 0 || minCh > 0 || sort !== 'latest' || query) && (
              <button onClick={() => { setGenres([]); setMinCh(0); setSort('latest'); setQuery('') }}
                className="ml-auto text-sm text-white/50 transition hover:text-white">Reset</button>
            )}
          </div>
          {query && <p className="mt-3 text-sm text-white/55">{filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;</p>}
        </div>

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
