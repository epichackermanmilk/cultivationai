'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'
import TokenWidget from '@/components/TokenWidget'

interface Novel {
  slug: string
  title: string
  author: string
  total_chapters: number
  genres: string[]
  cover_url: string
  description: string
}

// ── Particle canvas ──────────────────────────────────────────────────────────
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
        ctx.fillStyle = `rgba(251,191,36,${p.alpha})`  // amber-400
        ctx.fill()

        p.x += p.speedX
        p.y += p.speedY
        if (p.y < -5) {
          p.y = canvas.height + 5
          p.x = Math.random() * canvas.width
        }
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
      }
      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 0.6 }}
    />
  )
}

// ── Filter panel ─────────────────────────────────────────────────────────────
interface Filters {
  genres:     string[]
  genreMode:  'AND' | 'OR'
  minChapters: number
  maxChapters: number
  sort:       'default' | 'asc' | 'desc'
}

const DEFAULT_FILTERS: Filters = {
  genres: [], genreMode: 'OR', minChapters: 0, maxChapters: 99999, sort: 'default',
}

function FilterPanel({
  allGenres, filters, onChange, onClose,
}: {
  allGenres: string[]
  filters:   Filters
  onChange:  (f: Filters) => void
  onClose:   () => void
}) {
  const [local, setLocal] = useState<Filters>(filters)
  const up = (patch: Partial<Filters>) => setLocal(f => ({ ...f, ...patch }))

  const toggleGenre = (g: string) => {
    const next = local.genres.includes(g)
      ? local.genres.filter(x => x !== g)
      : [...local.genres, g]
    up({ genres: next })
  }

  const apply = () => { onChange(local); onClose() }
  const reset = () => { setLocal(DEFAULT_FILTERS); onChange(DEFAULT_FILTERS) }

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-[var(--nc-border)] p-4 shadow-2xl shadow-black/60" style={{ background: 'var(--nc-bg2)' }}>
      {/* Sort */}
      <section className="mb-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Chapter Count</h3>
        <div className="flex gap-2">
          {(['default','asc','desc'] as const).map(s => (
            <button
              key={s}
              onClick={() => up({ sort: s })}
              className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition ${
                local.sort === s ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {s === 'default' ? 'Default' : s === 'asc' ? '↑ Fewest' : '↓ Most'}
            </button>
          ))}
        </div>

        {/* Chapter range */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-zinc-500">Min</span>
            <input
              type="number" min={0} value={local.minChapters === 0 ? '' : local.minChapters}
              placeholder="0"
              onChange={e => up({ minChapters: Number(e.target.value) || 0 })}
              className="w-24 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-center text-xs text-zinc-100 outline-none focus:border-amber-500"
            />
          </div>
          <span className="mt-4 text-zinc-500">–</span>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-zinc-500">Max</span>
            <input
              type="number" min={0} value={local.maxChapters === 99999 ? '' : local.maxChapters}
              placeholder="∞"
              onChange={e => up({ maxChapters: Number(e.target.value) || 99999 })}
              className="w-24 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-center text-xs text-zinc-100 outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </section>

      {/* Genre mode */}
      <section className="mb-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Genres</h3>
          <div className="flex rounded-lg border border-zinc-700 overflow-hidden text-xs">
            {(['OR','AND'] as const).map(m => (
              <button
                key={m}
                onClick={() => up({ genreMode: m })}
                className={`px-3 py-1 font-medium transition ${
                  local.genreMode === m ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <p className="mb-2 text-xs text-zinc-600">
          {local.genreMode === 'OR' ? 'Match any selected genre' : 'Must have all selected genres'}
        </p>
        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
          {allGenres.map(g => (
            <button
              key={g}
              onClick={() => toggleGenre(g)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                local.genres.includes(g)
                  ? 'bg-amber-500 text-black'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </section>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-zinc-800">
        <button onClick={reset} className="flex-1 rounded-lg py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition">
          Reset
        </button>
        <button onClick={apply} className="flex-1 rounded-lg bg-amber-500 py-1.5 text-xs font-semibold text-black hover:bg-amber-400 transition">
          Apply
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [novels,  setNovels]  = useState<Novel[]>([])
  const [query,   setQuery]   = useState('')
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/novels')
      .then(async r => {
        const data = await r.json()
        setNovels(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Close filter panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const allGenres = useMemo(() => {
    const s = new Set<string>()
    novels.forEach(n => n.genres.forEach(g => s.add(g)))
    return [...s].sort()
  }, [novels])

  const filtered = useMemo(() => {
    let list = novels

    // Text search
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.author.toLowerCase().includes(q) ||
        n.genres.some(g => g.toLowerCase().includes(q))
      )
    }

    // Genre filter
    if (filters.genres.length > 0) {
      list = list.filter(n =>
        filters.genreMode === 'OR'
          ? filters.genres.some(g => n.genres.includes(g))
          : filters.genres.every(g => n.genres.includes(g))
      )
    }

    // Chapter range
    list = list.filter(n =>
      n.total_chapters >= filters.minChapters &&
      n.total_chapters <= filters.maxChapters
    )

    // Sort
    if (filters.sort === 'asc')  list = [...list].sort((a,b) => a.total_chapters - b.total_chapters)
    if (filters.sort === 'desc') list = [...list].sort((a,b) => b.total_chapters - a.total_chapters)

    return list
  }, [novels, query, filters])

  const activeFilterCount = (
    filters.genres.length +
    (filters.sort !== 'default' ? 1 : 0) +
    (filters.minChapters > 0 || filters.maxChapters < 99999 ? 1 : 0)
  )

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>
      <ParticleCanvas />

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[var(--nc-border)] bg-[var(--nc-bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-amber-400">NovelCodex</h1>
            <p className="text-xs text-zinc-500">Every secret, every character, every world — ask anything.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-amber-500/50 hover:text-amber-400 transition"
            >
              ✦ Multi-Novel Chat
            </Link>
            <TokenWidget />
            <ThemeToggle />
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
              <FilterPanel
                allGenres={allGenres}
                filters={filters}
                onChange={setFilters}
                onClose={() => setShowFilters(false)}
              />
            )}
          </div>
        </div>

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
              {filtered.map(novel => (
                <NovelCard key={novel.slug} novel={novel} />
              ))}
            </div>
            {filtered.length === 0 && (
              <p className="py-20 text-center text-zinc-500">No novels found.</p>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function NovelCard({ novel }: { novel: Novel }) {
  const [imgErr, setImgErr] = useState(false)

  return (
    <Link href={`/novel/${novel.slug}`} className="group">
      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/80 backdrop-blur-sm transition-all duration-200 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-900/20">
        {/* Cover */}
        <div className="relative aspect-[3/4] bg-zinc-800 overflow-hidden">
          {novel.cover_url && !imgErr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={novel.cover_url}
              alt={novel.title}
              onError={() => setImgErr(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 p-3">
              <span className="text-center text-xs text-zinc-400 font-medium leading-tight">
                {novel.title}
              </span>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/70 to-transparent" />
          <span className="absolute bottom-1.5 right-2 text-xs font-medium text-zinc-300">
            {novel.total_chapters.toLocaleString()} ch
          </span>
        </div>
        {/* Info — fixed height so all cards in a row are uniform */}
        <div className="flex h-[5.5rem] flex-col justify-start p-2">
          <p className="line-clamp-2 text-xs font-semibold leading-tight text-zinc-100 group-hover:text-amber-400 transition-colors">
            {novel.title}
          </p>
          {novel.author && (
            <p className="mt-0.5 truncate text-xs text-zinc-500">{novel.author}</p>
          )}
          {novel.genres.length > 0 && (
            <p className="mt-1 truncate text-xs text-amber-600/80">{novel.genres[0]}</p>
          )}
        </div>
      </div>
    </Link>
  )
}
