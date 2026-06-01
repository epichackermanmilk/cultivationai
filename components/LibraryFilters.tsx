'use client'

// Shared library filter UI — used both in the library page body and the global
// SiteHeader Filters dropdown. Applying in the header navigates to /library with
// the encoded params; the library reads them back via paramsToFilters().

import { useState, useRef, useEffect, useMemo } from 'react'

export interface NovelLike { genres: string[]; total_chapters: number }

export interface Filters {
  genres:      string[]
  genreMode:   'AND' | 'OR'
  minChapters: number
  maxChapters: number
  sort:        'default' | 'asc' | 'desc'
}

export const CHAPTER_MAX = 10000
export const DEFAULT_FILTERS: Filters = {
  genres: [], genreMode: 'OR', minChapters: 0, maxChapters: CHAPTER_MAX, sort: 'default',
}

// ── URL <-> Filters ────────────────────────────────────────────────────────────
export function filtersToParams(f: Filters, query?: string): string {
  const p = new URLSearchParams()
  if (query)                    p.set('q', query)
  if (f.genres.length)          p.set('genres', f.genres.join(','))
  if (f.genreMode !== 'OR')     p.set('gm', f.genreMode)
  if (f.minChapters > 0)        p.set('minc', String(f.minChapters))
  if (f.maxChapters < CHAPTER_MAX) p.set('maxc', String(f.maxChapters))
  if (f.sort !== 'default')     p.set('sort', f.sort)
  return p.toString()
}

export function paramsToFilters(sp: URLSearchParams): Filters {
  const genresRaw = sp.get('genres')
  const single    = sp.get('genre')   // single-genre shortcut from header chips
  const genres    = genresRaw ? genresRaw.split(',').filter(Boolean) : (single ? [single] : [])
  const gm        = sp.get('gm') === 'AND' ? 'AND' : 'OR'
  const minc      = parseInt(sp.get('minc') ?? '', 10)
  const maxc      = parseInt(sp.get('maxc') ?? '', 10)
  const sortRaw   = sp.get('sort')
  const sort      = sortRaw === 'asc' || sortRaw === 'desc' ? sortRaw : 'default'
  return {
    genres,
    genreMode:   gm,
    minChapters: Number.isFinite(minc) ? minc : 0,
    maxChapters: Number.isFinite(maxc) ? maxc : CHAPTER_MAX,
    sort,
  }
}

export function hasActiveFilters(f: Filters): boolean {
  return f.genres.length > 0 || f.sort !== 'default' || f.minChapters > 0 || f.maxChapters < CHAPTER_MAX
}

// ── Sub-components ───────────────────────────────────────────────────────────────
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
      <button onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition"
        style={{ borderColor: open ? 'var(--nc-amber)' : 'var(--nc-border)', color: 'var(--nc-text)', background: 'var(--nc-bg)' }}>
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
  allGenres, selected, genreMode, onToggle, onModeChange, onClearAll,
}: {
  allGenres: string[]; selected: string[]; genreMode: 'OR' | 'AND'
  onToggle: (g: string) => void; onModeChange: (m: 'OR' | 'AND') => void; onClearAll: () => void
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

// ── Main filter panel ────────────────────────────────────────────────────────────
export function FilterPanel({ allGenres, novels, filters, onChange, onClose }: {
  allGenres: string[]; novels: NovelLike[]; filters: Filters
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
            <input type="range" className="nc-range" min={0} max={CHAPTER_MAX} step={100}
              value={local.minChapters}
              onChange={e => { const v = Math.min(Number(e.target.value), local.maxChapters - 1); up({ minChapters: v }) }}
              style={{ zIndex: local.minChapters > CHAPTER_MAX - 100 ? 5 : 3 }} />
            <input type="range" className="nc-range" min={0} max={CHAPTER_MAX} step={100}
              value={local.maxChapters}
              onChange={e => { const v = Math.max(Number(e.target.value), local.minChapters + 1); up({ maxChapters: v }) }}
              style={{ zIndex: 4 }} />
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
            onClearAll={() => up({ genres: [] })} />
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
