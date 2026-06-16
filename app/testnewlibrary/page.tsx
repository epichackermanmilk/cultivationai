'use client'

// /testnewlibrary — full visual + structural redesign (Netflix × AsuraScans × Steam).
// Production pages untouched. Reuses existing APIs (/api/novels/all). Purple accent
// is a single token (--v) — flip to amber by changing it. The "living background"
// extracts the dominant color from the selected cover (via the same-origin /api/cover
// proxy, so canvas reads aren't CORS-tainted) and washes the page in it.

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { coverSrc } from '@/lib/cover'
import { useAuth } from '@/lib/auth-context'

interface Novel {
  slug: string; title: string; author: string; total_chapters: number
  genres: string[]; cover_url: string; locked?: boolean; coming_soon?: boolean
}
type RGB = [number, number, number]

// ── Dominant-color extraction (same-origin cover → canvas → average of vivid pixels)
function useDominantColor(src: string | null): RGB {
  const [rgb, setRgb] = useState<RGB>([124, 58, 237]) // default violet
  useEffect(() => {
    if (!src) return
    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        const w = (c.width = 48), h = (c.height = 48)
        const ctx = c.getContext('2d', { willReadFrequently: true })!
        ctx.drawImage(img, 0, 0, w, h)
        const d = ctx.getImageData(0, 0, w, h).data
        let r = 0, g = 0, b = 0, n = 0
        for (let i = 0; i < d.length; i += 4) {
          const R = d[i], G = d[i + 1], B = d[i + 2]
          const max = Math.max(R, G, B), min = Math.min(R, G, B)
          const sat = max === 0 ? 0 : (max - min) / max
          // weight toward vivid, mid-bright pixels (skip near-black/white/grey)
          if (max < 40 || min > 215 || sat < 0.22) continue
          r += R; g += G; b += B; n++
        }
        if (n > 0 && !cancelled) setRgb([Math.round(r / n), Math.round(g / n), Math.round(b / n)])
      } catch { /* tainted/blocked — keep previous */ }
    }
    img.src = src
    return () => { cancelled = true }
  }, [src])
  return rgb
}

const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

// ── Skeleton ────────────────────────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`tnl-skeleton ${className}`} />
}

// ── Cover image with fade-in + graceful fallback ─────────────────────────────────
function Cover({ novel, className = '', eager = false }: { novel: Novel; className?: string; eager?: boolean }) {
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState(false)
  return (
    <div className={`relative overflow-hidden bg-white/5 ${className}`}>
      {!loaded && !err && <Skeleton className="absolute inset-0" />}
      {!err ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverSrc(novel.cover_url)} alt={novel.title} loading={eager ? 'eager' : 'lazy'} decoding="async"
          onLoad={() => setLoaded(true)} onError={() => setErr(true)}
          className={`h-full w-full object-cover transition-all duration-700 ${loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`} />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-3 text-center text-xs font-medium text-white/70">{novel.title}</div>
      )}
    </div>
  )
}

export default function TestNewLibrary() {
  const { user } = useAuth()
  const [novels, setNovels] = useState<Novel[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Novel | null>(null)
  const [popTab, setPopTab] = useState<'Weekly' | 'Monthly' | 'All Time'>('Weekly')
  const railRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/novels/all').then(r => r.json()).then((d: Novel[]) => {
      const arr = Array.isArray(d) ? d : []
      setNovels(arr); setLoading(false)
      const firstLive = arr.find(n => !n.locked && !n.coming_soon)
      if (firstLive) setSelected(firstLive)
    }).catch(() => setLoading(false))
  }, [])

  const featured = useMemo(() => novels.filter(n => !n.locked && !n.coming_soon).slice(0, 12), [novels])
  const byChapters = useMemo(() => [...novels].sort((a, b) => (b.total_chapters || 0) - (a.total_chapters || 0)), [novels])
  const trending = useMemo(() => (featured.length ? featured : byChapters).slice(0, 10), [featured, byChapters])
  const latest = useMemo(() => byChapters.slice(0, 8), [byChapters])
  const popular = useMemo(() => {
    // No time-series data yet — proxy by chapter count, varied per tab for the demo.
    const off = popTab === 'Weekly' ? 0 : popTab === 'Monthly' ? 3 : 6
    return byChapters.slice(off, off + 5)
  }, [byChapters, popTab])

  const accent = useDominantColor(selected ? coverSrc(selected.cover_url) : null)

  const scrollRail = useCallback((dir: number) => {
    railRef.current?.scrollBy({ left: dir * 600, behavior: 'smooth' })
  }, [])

  return (
    <div className="tnl-root relative min-h-screen text-white" style={{ ['--v' as string]: '124,58,237' }}>
      {/* ── Living background ───────────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" style={{ background: '#07060d' }}>
        {selected && (
          <img key={selected.slug} src={coverSrc(selected.cover_url)} alt="" aria-hidden
            className="absolute inset-0 h-full w-full object-cover tnl-bgfade"
            style={{ filter: 'blur(60px) saturate(1.3)', transform: 'scale(1.25)', opacity: 0.28 }} />
        )}
        <div className="absolute inset-0 tnl-bgfade" style={{
          background: `radial-gradient(120% 80% at 50% -10%, ${rgba(accent, 0.45)} 0%, transparent 55%),
                       radial-gradient(90% 60% at 85% 30%, ${rgba(accent, 0.22)} 0%, transparent 55%),
                       linear-gradient(180deg, rgba(7,6,13,0.35) 0%, #07060d 70%)` }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 0%, transparent 40%, rgba(7,6,13,0.85) 100%)' }} />
      </div>

      {/* ── Header (sticky, glass) ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 tnl-glass">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
          <Link href="/testnewlibrary" className="flex items-center gap-2 shrink-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black"
              style={{ background: 'rgba(var(--v),0.9)', boxShadow: '0 0 20px rgba(var(--v),0.5)' }}>NC</span>
            <span className="hidden text-lg font-bold tracking-tight sm:block">NovelCodex</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {[['Home', '/testnewlibrary'], ['Library', '/library'], ['Games', '/games'], ['Recommend', '/recommend']].map(([l, h]) => (
              <Link key={l} href={h} className="rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white">{l}</Link>
            ))}
          </nav>
          <div className="relative mx-auto w-full max-w-md">
            <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input placeholder="Search novels, characters, lore…"
              className="h-10 w-full rounded-full border border-white/10 bg-black/30 pl-10 pr-4 text-sm text-white placeholder-white/40 outline-none backdrop-blur-md transition focus:border-[rgba(var(--v),0.6)] focus:bg-black/40" />
          </div>
          {user ? (
            <Link href="/profile" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: 'rgba(var(--v),0.85)' }}>
              {(user.username || user.email || '?')[0]?.toUpperCase()}
            </Link>
          ) : (
            <Link href="/library" className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition hover:brightness-110"
              style={{ background: 'rgba(var(--v),0.9)', boxShadow: '0 0 18px rgba(var(--v),0.4)' }}>Log In</Link>
          )}
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1400px] px-4 pb-24 sm:px-6">

        {/* ── Featured carousel ─────────────────────────────────────────────── */}
        <section className="pt-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50">Featured</h2>
            <div className="hidden gap-2 sm:flex">
              <button onClick={() => scrollRail(-1)} className="tnl-navbtn">‹</button>
              <button onClick={() => scrollRail(1)} className="tnl-navbtn">›</button>
            </div>
          </div>
          {loading ? (
            <div className="flex gap-4 overflow-hidden">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] w-44 shrink-0 rounded-2xl" />)}</div>
          ) : (
            <div ref={railRef} className="tnl-rail flex gap-4 overflow-x-auto pb-3">
              {featured.map((n, i) => {
                const isSel = selected?.slug === n.slug
                return (
                  <button key={n.slug} onClick={() => setSelected(n)}
                    className={`group relative aspect-[3/4] w-44 shrink-0 overflow-hidden rounded-2xl text-left transition-all duration-300 ${isSel ? 'ring-2 ring-[rgba(var(--v),0.9)]' : 'ring-1 ring-white/10'} hover:-translate-y-1.5`}
                    style={isSel ? { boxShadow: `0 18px 50px ${rgba(accent, 0.45)}` } : {}}>
                    <Cover novel={n} className="h-full w-full" eager={i < 4} />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3">
                      <p className="line-clamp-2 text-sm font-bold leading-tight drop-shadow">{n.title}</p>
                      <p className="mt-0.5 text-[11px] text-white/60">{(n.total_chapters || 0).toLocaleString()} ch · {n.genres?.[0] ?? 'Novel'}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Spotlight (selected novel hero strip) ─────────────────────────── */}
        {selected && (
          <section className="mt-6 tnl-panel overflow-hidden p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Cover novel={selected} className="h-44 w-32 shrink-0 rounded-xl ring-1 ring-white/15" eager />
              <div className="min-w-0">
                <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">{selected.title}</h1>
                <p className="mt-1 text-sm text-white/60">{selected.author || 'Unknown author'} · {(selected.total_chapters || 0).toLocaleString()} chapters</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(selected.genres ?? []).slice(0, 5).map(g => (
                    <span key={g} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-white/70">{g}</span>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <Link href={`/testnewlibrary/${selected.slug}`} className="rounded-xl px-4 py-2 text-sm font-semibold transition hover:brightness-110"
                    style={{ background: 'rgba(var(--v),0.95)', boxShadow: `0 0 22px ${rgba(accent, 0.5)}` }}>Open Novel →</Link>
                  <Link href={`/novel/${selected.slug}`} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/10">Chat with this book</Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Trending Lately ───────────────────────────────────────────────── */}
        <Section title="Trending Lately">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {(loading ? Array.from({ length: 5 }) : trending).map((n, i) => n ? (
              <NovelCard key={(n as Novel).slug} novel={n as Novel} onHover={() => setSelected(n as Novel)} />
            ) : <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />)}
          </div>
        </Section>

        {/* ── Latest Updates + Popular ──────────────────────────────────────── */}
        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
          {/* Latest Updates */}
          <Section title="Latest Updates" noTop>
            <div className="tnl-panel divide-y divide-white/5">
              {(loading ? Array.from({ length: 6 }) : latest).map((n, i) => n ? (
                <Link key={(n as Novel).slug} href={`/testnewlibrary/${(n as Novel).slug}`} className="flex items-center gap-3 p-3 transition hover:bg-white/5">
                  <Cover novel={n as Novel} className="h-16 w-12 shrink-0 rounded-lg ring-1 ring-white/10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{(n as Novel).title}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {[0, 1, 2].map(k => {
                        const ch = ((n as Novel).total_chapters || 0) - k
                        return ch > 0 ? <span key={k} className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-white/60">Ch. {ch}</span> : null
                      })}
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] text-white/40">{(n as Novel).genres?.[0] ?? ''}</span>
                </Link>
              ) : <div key={i} className="p-3"><Skeleton className="h-16 rounded-lg" /></div>)}
            </div>
          </Section>

          {/* Popular ranking */}
          <Section title="Popular" noTop>
            <div className="tnl-panel p-4">
              <div className="mb-4 flex gap-1 rounded-xl bg-black/30 p-1">
                {(['Weekly', 'Monthly', 'All Time'] as const).map(t => (
                  <button key={t} onClick={() => setPopTab(t)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${popTab === t ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
                    style={popTab === t ? { background: 'rgba(var(--v),0.9)' } : {}}>{t}</button>
                ))}
              </div>
              <div className="space-y-1">
                {(loading ? Array.from({ length: 5 }) : popular).map((n, i) => n ? (
                  <Link key={(n as Novel).slug} href={`/testnewlibrary/${(n as Novel).slug}`} onMouseEnter={() => setSelected(n as Novel)}
                    className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/5">
                    <span className="w-6 text-center text-lg font-black" style={{ color: i < 3 ? 'rgb(var(--v))' : 'rgba(255,255,255,0.3)' }}>{i + 1}</span>
                    <Cover novel={n as Novel} className="h-14 w-10 shrink-0 rounded-md ring-1 ring-white/10" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{(n as Novel).title}</p>
                      <p className="truncate text-[11px] text-white/50">{((n as Novel).genres ?? []).slice(0, 2).join(', ')}</p>
                    </div>
                  </Link>
                ) : <div key={i} className="p-2"><Skeleton className="h-14 rounded-md" /></div>)}
              </div>
            </div>
          </Section>
        </div>
      </main>

      <style jsx global>{`
        .tnl-root { font-feature-settings: "cv02","cv03"; }
        .tnl-glass { background: rgba(10,8,18,0.6); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.07); }
        .tnl-panel { background: rgba(18,15,30,0.55); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; backdrop-filter: blur(12px); box-shadow: 0 20px 50px rgba(0,0,0,0.4); }
        .tnl-navbtn { display:flex; height:34px; width:34px; align-items:center; justify-content:center; border-radius:10px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:#fff; font-size:18px; transition:.2s; }
        .tnl-navbtn:hover { background: rgba(var(--v),0.25); border-color: rgba(var(--v),0.5); }
        .tnl-rail { scrollbar-width: none; scroll-snap-type: x proximity; }
        .tnl-rail::-webkit-scrollbar { display: none; }
        .tnl-rail > * { scroll-snap-align: start; }
        .tnl-bgfade { transition: opacity 0.9s ease, background 0.9s ease; }
        @keyframes tnl-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
        .tnl-skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 37%, rgba(255,255,255,0.04) 63%); background-size: 400% 100%; animation: tnl-shimmer 1.4s ease infinite; }
        @keyframes tnl-fadeup { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform:none; } }
        .tnl-fadeup { animation: tnl-fadeup .5s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children, noTop }: { title: string; children: React.ReactNode; noTop?: boolean }) {
  return (
    <section className={noTop ? '' : 'mt-12'}>
      <h2 className="mb-4 text-xl font-extrabold tracking-tight">{title}</h2>
      <div className="tnl-fadeup">{children}</div>
    </section>
  )
}

// ── Grid novel card ───────────────────────────────────────────────────────────
function NovelCard({ novel, onHover }: { novel: Novel; onHover?: () => void }) {
  return (
    <Link href={`/testnewlibrary/${novel.slug}`} onMouseEnter={onHover}
      className="group relative aspect-[3/4] overflow-hidden rounded-2xl ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-1.5 hover:ring-[rgba(var(--v),0.7)]">
      <Cover novel={novel} className="h-full w-full" />
      <div className="absolute inset-x-0 bottom-0 translate-y-1 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 transition group-hover:translate-y-0">
        <p className="line-clamp-2 text-sm font-bold leading-tight">{novel.title}</p>
        <p className="mt-0.5 text-[11px] text-white/60">{(novel.total_chapters || 0).toLocaleString()} ch · {novel.genres?.[0] ?? 'Novel'}</p>
      </div>
    </Link>
  )
}
