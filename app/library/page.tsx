'use client'

import { useEffect, useState, useMemo, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link          from 'next/link'
import SiteHeader    from '@/components/SiteHeader'
import BookmarkButton from '@/components/BookmarkButton'
import RecentSection  from '@/components/RecentSection'
import FeedbackWidget from '@/components/FeedbackWidget'
import Footer         from '@/components/Footer'
import AdSlot         from '@/components/AdSlot'
import { FilterPanel, type Filters, DEFAULT_FILTERS, CHAPTER_MAX, paramsToFilters, hasActiveFilters } from '@/components/LibraryFilters'

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


const PAGE_SIZE = 28 // multiple of grid columns for clean rows

// Reads ?q= and the structured filter params (set by the global header search +
// Filters dropdown) and pushes them into the library's state. Wrapped in Suspense
// per Next's useSearchParams rule.
function SearchParamSync({ onQuery, onFilters }: { onQuery: (q: string) => void; onFilters: (f: Filters) => void }) {
  const sp  = useSearchParams()
  const key = sp.toString()
  useEffect(() => {
    const q = sp.get('q')
    if (q) onQuery(q)
    if (sp.has('genres') || sp.has('genre') || sp.has('gm') || sp.has('sort') || sp.has('minc') || sp.has('maxc')) {
      onFilters(paramsToFilters(sp))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return null
}

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
    <div className="relative min-h-screen pb-16 sm:pb-0" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>
      <Suspense fallback={null}><SearchParamSync onQuery={setQuery} onFilters={setFilters} /></Suspense>
      <ParticleCanvas />

      <SiteHeader />

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
            {/* Grid with ads injected every 24 cards (≈4 rows at 6-col, 8 rows at 3-col) */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {visibleNovels.map((novel, index) => (
                <>
                  {index > 0 && index % 24 === 0 && (
                    <div key={`ad-${index}`} className="col-span-full">
                      <AdSlot variant="banner" className="rounded-xl my-1" />
                    </div>
                  )}
                  <NovelCard key={novel.slug} novel={novel} />
                </>
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
