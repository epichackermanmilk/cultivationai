'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import TokenWidget    from '@/components/TokenWidget'
import BookmarkButton from '@/components/BookmarkButton'
import RecentSection  from '@/components/RecentSection'
import FeedbackWidget from '@/components/FeedbackWidget'
import Footer         from '@/components/Footer'

interface Novel {
  slug: string
  title: string
  author: string
  total_chapters: number
  genres: string[]
  cover_url: string
  description: string
}

// ── Particle canvas ───────────────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let animId: number

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = document.documentElement.scrollHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const COUNT = 60
    const particles = Array.from({ length: COUNT }, () => ({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      r:     Math.random() * 1.5 + 0.4,
      speedX: (Math.random() - 0.5) * 0.25,
      speedY: -Math.random() * 0.35 - 0.1,
      alpha:  Math.random() * 0.5 + 0.15,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(251,191,36,${p.alpha})`
        ctx.fill()
        p.x += p.speedX
        p.y += p.speedY
        if (p.y < -5) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width }
        if (p.x < 0)  p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
      }
      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" style={{ opacity: 0.6 }} />
}

// ── Filter panel ──────────────────────────────────────────────────────────────
interface Filters {
  genres:      string[]
  genreMode:   'AND' | 'OR'
  minChapters: number
  maxChapters: number
  sort:        'default' | 'asc' | 'desc'
}

const DEFAULT_FILTERS: Filters = {
  genres: [], genreMode: 'OR', minChapters: 0, maxChapters: 5000, sort: 'default',
}
const CHAPTER_MAX = 5000

function Chevron({ open }: { open: boolean }) {
  return (
    <svg className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function SortDropdown({ value, onChange }: { value: Filters['sort']; onChange: (v: Filters['sort']) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const opts = [
    { v: 'default' as const, label: 'Default' },
    { v: 'desc'    as const, label: '↓ Most chapters' },
    { v: 'asc'     as const, label: '↑ Fewest chapters' },
  ]
  const selected = opts.find(o => o.v === value)!

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition"
        style={{ borderColor: open ? 'var(--nc-amber)' : 'var(--nc-border)', color: 'var(--nc-text)', background: 'var(--nc-bg)' }}
      >
        <span>{selected.label}</span><Chevron open={open} />
      </button>
      {open && (
        <div className="absolute z-20 w-full mt-1 rounded-lg border shadow-xl overflow-hidden"
          style={{ background: 'var(--nc-bg2)', borderColor: 'var(--nc-border)' }}>
          {opts.map(o => (
            <button key={o.v} onClick={() => { onChange(o.v); setOpen(false) }}
              className="flex w-full items-center px-3 py-2.5 text-sm transition hover:bg-zinc-800/50"
              style={{ color: value === o.v ? 'var(--nc-amber)' : 'var(--nc-text)', background: value === o.v ? 'rgba(245,158,11,0.08)' : undefined }}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function GenreDropdown({
  allGenres, selected, genreMode, onToggle, onModeChange, onClearAll, matchCount,
}: {
  allGenres: string[]; selected: string[]; genreMode: 'OR' | 'AND'
  onToggle: (g: string) => void; onModeChange: (m: 'OR' | 'AND') => void
  onClearAll: () => void; matchCount: number
}) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const visible = allGenres.filter(g => g.toLowerCase().includes(search.toLowerCase()))
  const count   = selected.length

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition"
        style={{ borderColor: open ? 'var(--nc-amber)' : 'var(--nc-border)', color: 'var(--nc-text)', background: 'var(--nc-bg)' }}>
        <span>{count > 0 ? `${count} genre${count > 1 ? 's' : ''} selected` : 'All Genres'}</span>
        <Chevron open={open} />
      </button>
      {open && (
        <div className="absolute z-20 w-full mt-1 rounded-lg border shadow-xl overflow-hidden"
          style={{ background: 'var(--nc-bg2)', borderColor: 'var(--nc-border)' }}>
          <div className="p-2" style={{ borderBottom: '1px solid var(--nc-border)' }}>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search genres…"
              className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none focus:border-amber-500"
              style={{ background: 'var(--nc-bg)', borderColor: 'var(--nc-border)', color: 'var(--nc-text)' }} />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {visible.length === 0 && <p className="px-3 py-3 text-xs text-center" style={{ color: 'var(--nc-text2)' }}>No genres match</p>}
            {visible.map(g => (
              <button key={g} onClick={() => onToggle(g)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition hover:bg-zinc-800/50"
                style={{ color: 'var(--nc-text)' }}>
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${selected.includes(g) ? 'border-amber-500 bg-amber-500' : 'border-zinc-600 bg-transparent'}`}>
                  {selected.includes(g) && <span className="text-black text-[10px] font-bold">✓</span>}
                </span>
                {g}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 p-2" style={{ borderTop: '1px solid var(--nc-border)' }}>
            <span className="text-xs shrink-0" style={{ color: 'var(--nc-text2)' }}>Match</span>
            <div className="flex rounded-lg border border-zinc-700 overflow-hidden text-xs">
              {(['OR','AND'] as const).map(m => (
                <button key={m} onClick={() => onModeChange(m)}
                  className={`px-2.5 py-1 transition font-medium ${genreMode === m ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-zinc-200'}`}>
                  {m}
                </button>
              ))}
            </div>
            {count > 0 && (
              <button onClick={onClearAll} className="ml-auto text-xs transition hover:text-zinc-200" style={{ color: 'var(--nc-text2)' }}>
                Clear ({count})
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function FilterPanel({ allGenres, novels, filters, onChange, onClose }: {
  allGenres: string[]; novels: Novel[]; filters: Filters
  onChange: (f: Filters) => void; onClose: () => void
}) {
  const [local, setLocal] = useState<Filters>(filters)
  const up = (patch: Partial<Filters>) => setLocal(f => ({ ...f, ...patch }))

  const toggleGenre = (g: string) =>
    up({ genres: local.genres.includes(g) ? local.genres.filter(x => x !== g) : [...local.genres, g] })

  const previewCount = useMemo(() => novels.filter(n => {
    if (local.genres.length > 0) {
      const ok = local.genreMode === 'OR'
        ? local.genres.some(g => n.genres.includes(g))
        : local.genres.every(g => n.genres.includes(g))
      if (!ok) return false
    }
    return n.total_chapters >= local.minChapters && n.total_chapters <= local.maxChapters
  }).length, [novels, local])

  const apply = () => { onChange(local); onClose() }
  const reset = () => { setLocal(DEFAULT_FILTERS); onChange(DEFAULT_FILTERS); onClose() }

  const loPct = (local.minChapters / CHAPTER_MAX) * 100
  const hiPct = (local.maxChapters / CHAPTER_MAX) * 100

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border shadow-2xl shadow-black/60"
      style={{ background: 'var(--nc-bg2)', borderColor: 'var(--nc-border)' }}>
      <div className="p-4 space-y-5">
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--nc-text2)' }}>Sort by</p>
          <SortDropdown value={local.sort} onChange={v => up({ sort: v })} />
        </section>
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--nc-text2)' }}>Chapter Count</p>
          <div className="relative h-5 flex items-center mb-3">
            <div className="absolute h-1 rounded-full" style={{ background: 'var(--nc-bg3)', left: '9px', right: '9px' }}>
              <div className="absolute h-1 rounded-full bg-amber-500" style={{ left: `${loPct}%`, right: `${100 - hiPct}%` }} />
            </div>
            <input type="range" className="nc-range" min={0} max={CHAPTER_MAX} step={50}
              value={local.minChapters}
              onChange={e => { const v = Math.min(Number(e.target.value), local.maxChapters - 1); up({ minChapters: v }) }}
              style={{ zIndex: local.minChapters > CHAPTER_MAX - 100 ? 5 : 3 }}
            />
            <input type="range" className="nc-range" min={0} max={CHAPTER_MAX} step={50}
              value={local.maxChapters}
              onChange={e => { const v = Math.max(Number(e.target.value), local.minChapters + 1); up({ maxChapters: v }) }}
              style={{ zIndex: 4 }}
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <span className="text-xs text-center" style={{ color: 'var(--nc-text2)' }}>Min</span>
              <input type="number" min={0} max={CHAPTER_MAX} value={local.minChapters}
                onChange={e => { const v = Math.min(Math.max(Number(e.target.value) || 0, 0), local.maxChapters - 1); up({ minChapters: v }) }}
                className="rounded-lg border px-2 py-1.5 text-center text-xs outline-none focus:border-amber-500"
                style={{ background: 'var(--nc-bg)', borderColor: 'var(--nc-border)', color: 'var(--nc-text)' }} />
            </div>
            <span className="mt-4 text-xs" style={{ color: 'var(--nc-text2)' }}>–</span>
            <div className="flex flex-1 flex-col gap-1">
              <span className="text-xs text-center" style={{ color: 'var(--nc-text2)' }}>Max</span>
              <input type="number" min={0} max={CHAPTER_MAX} value={local.maxChapters}
                onChange={e => { const v = Math.max(Math.min(Number(e.target.value) || CHAPTER_MAX, CHAPTER_MAX), local.minChapters + 1); up({ maxChapters: v }) }}
                className="rounded-lg border px-2 py-1.5 text-center text-xs outline-none focus:border-amber-500"
                style={{ background: 'var(--nc-bg)', borderColor: 'var(--nc-border)', color: 'var(--nc-text)' }} />
            </div>
          </div>
        </section>
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--nc-text2)' }}>Genres</p>
          <GenreDropdown allGenres={allGenres} selected={local.genres} genreMode={local.genreMode}
            onToggle={toggleGenre} onModeChange={m => up({ genreMode: m })}
            onClearAll={() => up({ genres: [] })} matchCount={previewCount} />
        </section>
      </div>
      <div className="flex items-center gap-2 px-4 py-3 rounded-b-xl"
        style={{ borderTop: '1px solid var(--nc-border)', background: 'var(--nc-bg)' }}>
        <button onClick={reset} className="flex-1 rounded-lg py-2 text-xs font-medium transition hover:text-zinc-200" style={{ color: 'var(--nc-text2)' }}>
          Clear all
        </button>
        <button onClick={apply} className="flex-1 rounded-lg bg-amber-500 py-2 text-xs font-semibold text-black hover:bg-amber-400 transition">
          Show {previewCount.toLocaleString()}
        </button>
      </div>
    </div>
  )
}

const PAGE_SIZE = 28 // multiple of grid columns for clean rows

// ── Library page ──────────────────────────────────────────────────────────────
export default function LibraryPage() {
  const [novels,       setNovels]       = useState<Novel[]>([])
  const [query,        setQuery]        = useState('')
  const [loading,      setLoading]      = useState(true)
  const [filters,      setFilters]      = useState<Filters>(DEFAULT_FILTERS)
  const [showFilters,  setShowFilters]  = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const filterRef  = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Fetch once — data is cached server-side for 90s so this is near-instant
  useEffect(() => {
    fetch('/api/novels')
      .then(async r => { const data = await r.json(); setNovels(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Close filter panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilters(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Reset visible count whenever search/filters change
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [query, filters])

  const allGenres = useMemo(() => {
    const s = new Set<string>()
    novels.forEach(n => n.genres.forEach(g => s.add(g)))
    return [...s].sort()
  }, [novels])

  const filtered = useMemo(() => {
    let list = novels
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.author.toLowerCase().includes(q) ||
        n.genres.some(g => g.toLowerCase().includes(q))
      )
    }
    if (filters.genres.length > 0) {
      list = list.filter(n =>
        filters.genreMode === 'OR'
          ? filters.genres.some(g => n.genres.includes(g))
          : filters.genres.every(g => n.genres.includes(g))
      )
    }
    list = list.filter(n => n.total_chapters >= filters.minChapters && (filters.maxChapters >= CHAPTER_MAX || n.total_chapters <= filters.maxChapters))
    if (filters.sort === 'asc')  list = [...list].sort((a,b) => a.total_chapters - b.total_chapters)
    if (filters.sort === 'desc') list = [...list].sort((a,b) => b.total_chapters - a.total_chapters)
    return list
  }, [novels, query, filters])

  // Infinite scroll — load PAGE_SIZE more when sentinel enters viewport
  const loadMore = useCallback(() => {
    setVisibleCount(c => Math.min(c + PAGE_SIZE, filtered.length))
  }, [filtered.length])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore() },
      { rootMargin: '600px' } // start loading 600px before sentinel is visible
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadMore])

  const visibleNovels = filtered.slice(0, visibleCount)

  const activeFilterCount = (
    filters.genres.length +
    (filters.sort !== 'default' ? 1 : 0) +
    (filters.minChapters > 0 || filters.maxChapters < CHAPTER_MAX ? 1 : 0)
  )

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>
      <ParticleCanvas />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--nc-border)] bg-[var(--nc-bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/library" className="group">
            <h1 className="text-xl font-bold tracking-tight text-amber-400 group-hover:text-amber-300 transition">NovelCodex</h1>
            <p className="text-xs text-zinc-500">Every secret, every character, every world — ask anything.</p>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="flex items-center rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs font-medium text-amber-400/75 hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-400 transition"
            >
              ✦ Multi-Novel Chat
            </Link>
            <Link
              href="/characters"
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs font-medium text-amber-400/75 hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-400 transition"
              title="Character Chat"
            >
              🎭 Characters
            </Link>
            <Link
              href="/recommend"
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs font-medium text-amber-400/75 hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-400 transition"
              title="Get recommendations"
            >
              Recommend
            </Link>
            <Link
              href="/bookmarks"
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs font-medium text-amber-400/75 hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-400 transition"
              title="My Bookmarks"
            >
              Bookmarks
            </Link>
            <TokenWidget />
            <span className="text-sm text-zinc-500">{novels.length.toLocaleString()} novels</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8">
        {/* Search + Filter */}
        <div className="mb-8 flex gap-2">
          <input
            type="text"
            placeholder="Search by title, author, or genre…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
          />
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex h-full items-center gap-2 rounded-lg border px-4 text-sm font-medium transition ${
                showFilters || activeFilterCount > 0
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M11 12h2M9 16h6" />
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-xs text-black font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {showFilters && (
              <FilterPanel allGenres={allGenres} novels={novels} filters={filters}
                onChange={setFilters} onClose={() => setShowFilters(false)} />
            )}
          </div>
        </div>

        <RecentSection />

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg bg-zinc-800 aspect-[3/4]" />
            ))}
          </div>
        ) : (
          <>
            {(query || activeFilterCount > 0) && (
              <p className="mb-4 text-sm text-zinc-400">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                {query ? ` for "${query}"` : ''}
              </p>
            )}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {visibleNovels.map(novel => (
                <NovelCard key={novel.slug} novel={novel} />
              ))}
            </div>
            {filtered.length === 0 && (
              <p className="py-20 text-center text-zinc-500">No novels found.</p>
            )}
            {/* Sentinel — IntersectionObserver watches this to trigger the next page */}
            <div ref={sentinelRef} className="h-1" />
            {/* Show spinner while more cards are queued to render */}
            {visibleCount < filtered.length && (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
      <FeedbackWidget />
    </div>
  )
}

function NovelCard({ novel }: { novel: Novel }) {
  const [imgErr, setImgErr] = useState(false)

  return (
    <Link href={`/novel/${novel.slug}`} className="group">
      <div
        className="overflow-hidden rounded-lg border transition-all duration-200 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-900/20"
        style={{ borderColor: 'var(--nc-border)', background: 'var(--nc-bg2)' }}
      >
        <div className="relative aspect-[3/4] overflow-hidden" style={{ background: 'var(--nc-bg3)' }}>
          {novel.cover_url && !imgErr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={novel.cover_url}
              alt={novel.title}
              loading="lazy"
              decoding="async"
              onError={() => setImgErr(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-3" style={{ background: 'var(--nc-bg3)' }}>
              <span className="text-center text-xs font-medium leading-tight" style={{ color: 'var(--nc-text2)' }}>
                {novel.title}
              </span>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/70 to-transparent" />
          <span className="absolute bottom-1.5 right-2 text-xs font-medium text-zinc-300">
            {novel.total_chapters.toLocaleString()} ch
          </span>
          <BookmarkButton
            novel={novel}
            className="absolute right-1.5 top-1.5 h-6 w-6 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60"
          />
        </div>
        <div className="flex h-[5.5rem] flex-col justify-start p-2">
          <p className="line-clamp-2 text-xs font-semibold leading-tight group-hover:text-amber-400 transition-colors" style={{ color: 'var(--nc-text)' }}>
            {novel.title}
          </p>
          {novel.author && (
            <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--nc-muted)' }}>{novel.author}</p>
          )}
          {novel.genres.length > 0 && (
            <p className="mt-1 truncate text-xs text-amber-600/80">{novel.genres[0]}</p>
          )}
        </div>
      </div>
    </Link>
  )
}
