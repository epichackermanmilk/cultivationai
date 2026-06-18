'use client'

// / — homepage of the redesign (Netflix × AsuraScans × Steam).
//   • Top row: ~20 hand-curated covers in an endlessly looping marquee. Click once
//     to select (it grows + drives the living background); click again to open.
//     Hover gives an Asura-style light "sheen", never a resize.
//   • Trending Today: single arrow-scrolled row.
//   • Latest Updates: paged list (cover + 3 newest chapters) like AsuraScans.
//   • Popular: weekly/monthly/all-time ranking.
//   • Announcements: editable update feed.
// The "living background" extracts the dominant color of the selected cover and
// washes the whole page in it. Reuses /api/novels/all.

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { coverSrc } from '@/lib/cover'
import TestHeader from '@/components/TestHeader'
import { TestStyles, Cover, Skeleton, useDominantColor, rgba, type Novel } from '@/components/TestUI'
import { trackNovelClick } from '@/lib/analytics'

// ── Announcements feed — edit this array to post site updates ─────────────────────
const ANNOUNCEMENTS: { title: string; date: string; body: string }[] = [
  { title: 'Welcome to the new NovelCodex', date: 'Jun 16, 2026', body: 'A faster, cleaner library with a cinematic reading hub. Tell us what you think.' },
  { title: 'Codex Insight is live', date: 'Jun 10, 2026', body: 'Every featured novel now has an AI-built breakdown: power system, MC archetype, and who it is for.' },
  { title: 'More novels indexing weekly', date: 'Jun 2, 2026', body: 'We are hand-indexing chapters for new titles continuously. New worlds unlock every week.' },
]

const TIME_LABELS = ['2 hours ago', '5 hours ago', '9 hours ago', '12 hours ago', '1 day ago', '2 days ago', '4 days ago', '6 days ago', 'last week', '2 weeks ago']
function latestChapters(n: Novel, seed: number) {
  const total = n.total_chapters || 0
  return [0, 1, 2].map(k => ({ num: total - k, time: TIME_LABELS[(seed * 3 + k * 2) % TIME_LABELS.length] })).filter(c => c.num > 0)
}

// ── Top row: a looping coverflow. Click any cover → it animates to the center and
// becomes the selected (highlighted) novel. Click the already-centered one → open.
// Transform-based so centering is exact; three copies give a seamless infinite loop.
const CARD_W = 152, CARD_GAP = 14, PERIOD = CARD_W + CARD_GAP
function TopRow({ items, onSelect, accent }: {
  items: Novel[]; onSelect: (n: Novel) => void; accent: [number, number, number]
}) {
  const router = useRouter()
  const N = items.length
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [center, setCenter] = useState(N)   // index into the tripled list (middle copy)
  const [animate, setAnimate] = useState(true)

  // Measure the viewport width so we can translate the centered card to the middle.
  useEffect(() => {
    const el = wrapRef.current; if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el); setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  // After a click-driven slide, snap the index back into the middle copy with no
  // animation (the copies are identical, so the jump is invisible) — keeps the loop infinite.
  const normalize = useCallback(() => {
    setCenter(c => {
      if (c < N) { setAnimate(false); return c + N }
      if (c >= 2 * N) { setAnimate(false); return c - N }
      return c
    })
  }, [N])
  useEffect(() => {
    if (animate) return
    const id = requestAnimationFrame(() => setAnimate(true))
    return () => cancelAnimationFrame(id)
  }, [animate])

  if (!N) return null
  const tripled = [...items, ...items, ...items]
  const centerIdx = ((center % N) + N) % N
  const translateX = width ? width / 2 - (center * PERIOD + CARD_W / 2) : 0

  const onClick = (j: number, n: Novel) => {
    const idx = ((j % N) + N) % N
    if (idx === centerIdx) { trackNovelClick(n.slug, 'carousel'); router.push(`/novel/${n.slug}`); return }  // already centered → open
    onSelect(n); setAnimate(true); setCenter(j)                                  // otherwise slide it to center
  }

  return (
    <div ref={wrapRef} className="relative overflow-x-hidden py-6"
      style={{ maskImage: 'linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)' }}>
      <div className="flex will-change-transform"
        onTransitionEnd={normalize}
        style={{ gap: CARD_GAP, transform: `translateX(${translateX}px)`, transition: animate ? 'transform .45s cubic-bezier(0.22,1,0.36,1)' : 'none' }}>
        {tripled.map((n, i) => {
          const isSel = i === center
          return (
            <button key={`${n.slug}-${i}`} onClick={() => onClick(i, n)} title={isSel ? 'Click again to open' : n.title}
              className={`tnl-sheen relative aspect-[3/4] shrink-0 overflow-hidden rounded-xl text-left transition-[transform,box-shadow,opacity] duration-300 ${
                isSel ? 'z-10 scale-[1.14] ring-2' : 'ring-1 ring-white/10 opacity-70 hover:opacity-100'
              }`}
              style={{ width: CARD_W, ...(isSel ? { boxShadow: `0 22px 55px ${rgba(accent, 0.55)}`, ['--tw-ring-color' as string]: rgba(accent, 0.9) } : {}) }}>
              <Cover novel={n} className="h-full w-full" eager={i >= N && i < N + 6} />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-2.5">
                <p className="line-clamp-2 text-[13px] font-bold leading-tight drop-shadow">{n.title}</p>
              </div>
              {isSel && (
                <span className="absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold backdrop-blur" style={{ background: rgba(accent, 0.85) }}>OPEN ↵</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function TestNewLibrary() {
  const [novels, setNovels] = useState<Novel[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Novel | null>(null)
  const [popTab, setPopTab] = useState<'Weekly' | 'Monthly' | 'All Time'>('Weekly')
  const [luPage, setLuPage] = useState(1)
  const trendRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/novels/all').then(r => r.json()).then((d: Novel[]) => {
      const arr = Array.isArray(d) ? d : []
      setNovels(arr); setLoading(false)
      const firstLive = arr.find(n => !n.locked && !n.coming_soon)
      if (firstLive) setSelected(firstLive)
    }).catch(() => setLoading(false))
  }, [])

  const byChapters = useMemo(() => [...novels].sort((a, b) => (b.total_chapters || 0) - (a.total_chapters || 0)), [novels])

  // Curated top row: live titles first (guaranteed detail pages), then the most
  // recognizable big titles, up to 20. (Final build will use a hand-picked list.)
  const curated = useMemo(() => {
    const rank = (n: Novel) => (n.locked ? 2 : n.coming_soon ? 1 : 0)
    return [...byChapters].sort((a, b) => rank(a) - rank(b)).slice(0, 20)
  }, [byChapters])

  const trending = useMemo(() => byChapters.slice(0, 18), [byChapters])
  const LU_PER_PAGE = 10                     // 5 rows × 2 cols
  const latestPool = useMemo(() => byChapters.slice(0, LU_PER_PAGE * 5), [byChapters]) // 5 pages
  const luPages = Math.max(1, Math.ceil(latestPool.length / LU_PER_PAGE))
  const luSlice = latestPool.slice((luPage - 1) * LU_PER_PAGE, luPage * LU_PER_PAGE)

  const popular = useMemo(() => {
    const off = popTab === 'Weekly' ? 0 : popTab === 'Monthly' ? 3 : 6
    return byChapters.slice(off, off + 6)
  }, [byChapters, popTab])

  const accent = useDominantColor(selected ? coverSrc(selected.cover_url) : null)
  const scrollTrend = useCallback((dir: number) => trendRef.current?.scrollBy({ left: dir * 520, behavior: 'smooth' }), [])

  return (
    <div className="tnl-root relative min-h-screen text-white" style={{ ['--v' as string]: '124,58,237' }}>
      {/* ── Living background ───────────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" style={{ background: '#07060d' }}>
        {selected && (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={selected.slug} src={coverSrc(selected.cover_url)} alt="" aria-hidden
            className="absolute inset-0 h-full w-full object-cover tnl-bgfade"
            style={{ filter: 'blur(64px) saturate(1.35)', transform: 'scale(1.3)', opacity: 0.3 }} />
        )}
        <div className="absolute inset-0 tnl-bgfade" style={{
          background: `radial-gradient(120% 80% at 50% -10%, ${rgba(accent, 0.45)} 0%, transparent 55%),
                       radial-gradient(90% 60% at 85% 25%, ${rgba(accent, 0.22)} 0%, transparent 55%),
                       linear-gradient(180deg, rgba(7,6,13,0.35) 0%, #07060d 72%)` }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 0%, transparent 38%, rgba(7,6,13,0.88) 100%)' }} />
      </div>

      <TestHeader />

      <main className="relative z-10 mx-auto max-w-[1400px] px-4 pb-12 sm:px-6">

        {/* ── Top row (curated, looping, click-to-open) ─────────────────────── */}
        {loading ? (
          <div className="flex gap-3 overflow-hidden py-5">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] w-40 shrink-0 rounded-xl" />)}</div>
        ) : (
          <TopRow items={curated} onSelect={setSelected} accent={accent} />
        )}

        {/* ── Tight content frame ───────────────────────────────────────────── */}
        {/* min-w-0 on the 1fr column is critical: without it the inner scroll-rails
            force the grid track wider than the viewport (horizontal page scroll). */}
        <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Left column */}
          <div className="min-w-0 space-y-5">
            {/* Trending Today — single scrolling row + arrows */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-extrabold tracking-tight">Trending Today</h2>
                <div className="hidden gap-2 sm:flex">
                  <button onClick={() => scrollTrend(-1)} className="tnl-navbtn">‹</button>
                  <button onClick={() => scrollTrend(1)} className="tnl-navbtn">›</button>
                </div>
              </div>
              <div ref={trendRef} className="tnl-rail flex gap-3 overflow-x-auto pb-1">
                {(loading ? Array.from({ length: 8 }) : trending).map((n, i) => n ? (
                  <Link key={(n as Novel).slug} href={`/novel/${(n as Novel).slug}`} onClick={() => trackNovelClick((n as Novel).slug, 'trending')} onMouseEnter={() => setSelected(n as Novel)} className="group w-[140px] shrink-0">
                    <div className="tnl-sheen relative aspect-[3/4] overflow-hidden rounded-xl ring-1 ring-white/10 transition group-hover:ring-[rgba(var(--v),0.6)]">
                      <Cover novel={n as Novel} className="h-full w-full" />
                    </div>
                    <p className="mt-1.5 truncate text-[13px] font-semibold">{(n as Novel).title}</p>
                    <p className="text-[11px] text-white/50">Ch. {(n as Novel).total_chapters || 0}</p>
                  </Link>
                ) : <div key={i} className="w-[140px] shrink-0"><Skeleton className="aspect-[3/4] rounded-xl" /></div>)}
              </div>
            </div>

            {/* Latest Updates — paged, AsuraScans-style (cover + 3 newest chapters) */}
            <div>
              <h2 className="mb-3 text-lg font-extrabold tracking-tight">Latest Updates</h2>
              <div className="tnl-panel p-2 sm:p-3">
                <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                  {(loading ? Array.from({ length: LU_PER_PAGE }) : luSlice).map((n, i) => n ? (
                    <div key={(n as Novel).slug} className="flex gap-3 border-b border-white/[0.06] py-2.5 last:border-0">
                      <Link href={`/novel/${(n as Novel).slug}`} className="shrink-0">
                        <Cover novel={n as Novel} className="h-[68px] w-[50px] rounded-lg ring-1 ring-white/10" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`/novel/${(n as Novel).slug}`} onClick={() => trackNovelClick((n as Novel).slug, 'latest')} className="block truncate text-[13px] font-bold transition hover:text-[rgb(var(--v))]">{(n as Novel).title}</Link>
                        <div className="mt-1 space-y-0.5">
                          {latestChapters(n as Novel, (luPage - 1) * LU_PER_PAGE + i).map(c => (
                            <Link key={c.num} href={`/novel/${(n as Novel).slug}`} className="flex items-center justify-between gap-2 text-[12px]">
                              <span className="truncate text-white/65 transition hover:text-white">Chapter {c.num.toLocaleString()}</span>
                              <span className="shrink-0 text-[10px] text-white/35">{c.time}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : <div key={i} className="flex gap-3 py-2.5"><Skeleton className="h-[68px] w-[50px] rounded-lg" /><div className="flex-1 space-y-1.5 pt-1"><Skeleton className="h-3 w-2/3 rounded" /><Skeleton className="h-2.5 w-1/2 rounded" /><Skeleton className="h-2.5 w-1/2 rounded" /></div></div>)}
                </div>

                {/* Pagination 1..5 */}
                {!loading && luPages > 1 && (
                  <div className="mt-3 flex items-center justify-center gap-1.5 pt-2">
                    <button onClick={() => setLuPage(p => Math.max(1, p - 1))} disabled={luPage === 1} className="tnl-navbtn h-8 w-8 text-base disabled:opacity-30">‹</button>
                    {Array.from({ length: luPages }).map((_, i) => {
                      const p = i + 1
                      return (
                        <button key={p} onClick={() => setLuPage(p)}
                          className={`h-8 w-8 rounded-lg text-sm font-semibold transition ${p === luPage ? 'text-white' : 'text-white/55 hover:text-white'}`}
                          style={p === luPage ? { background: 'rgb(var(--v))' } : { border: '1px solid rgba(255,255,255,0.1)' }}>{p}</button>
                      )
                    })}
                    <button onClick={() => setLuPage(p => Math.min(luPages, p + 1))} disabled={luPage === luPages} className="tnl-navbtn h-8 w-8 text-base disabled:opacity-30">›</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column — Popular */}
          <div>
            <h2 className="mb-3 text-lg font-extrabold tracking-tight">Popular</h2>
            <div className="tnl-panel p-3">
              <div className="mb-3 flex gap-1 rounded-xl bg-black/30 p-1">
                {(['Weekly', 'Monthly', 'All Time'] as const).map(t => (
                  <button key={t} onClick={() => setPopTab(t)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${popTab === t ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
                    style={popTab === t ? { background: 'rgba(var(--v),0.9)' } : {}}>{t}</button>
                ))}
              </div>
              <div className="space-y-0.5">
                {(loading ? Array.from({ length: 6 }) : popular).map((n, i) => n ? (
                  <Link key={(n as Novel).slug} href={`/novel/${(n as Novel).slug}`} onClick={() => trackNovelClick((n as Novel).slug, 'popular')} onMouseEnter={() => setSelected(n as Novel)}
                    className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/5">
                    <span className="w-5 text-center text-base font-black" style={{ color: i < 3 ? 'rgb(var(--v))' : 'rgba(255,255,255,0.3)' }}>{i + 1}</span>
                    <Cover novel={n as Novel} className="h-12 w-9 shrink-0 rounded-md ring-1 ring-white/10" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold">{(n as Novel).title}</p>
                      <p className="truncate text-[11px] text-white/50">{((n as Novel).genres ?? []).slice(0, 2).join(', ')}</p>
                    </div>
                  </Link>
                ) : <div key={i} className="p-2"><Skeleton className="h-12 rounded-md" /></div>)}
              </div>
            </div>
          </div>
        </div>

        {/* ── Announcements ─────────────────────────────────────────────────── */}
        <section className="mt-6">
          <div className="tnl-panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold tracking-tight">Announcements</h2>
              <button className="rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:brightness-110" style={{ background: 'rgba(var(--v),0.9)' }}>View All</button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ANNOUNCEMENTS.map(a => (
                <div key={a.title} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black" style={{ background: 'rgba(var(--v),0.85)' }}>NC</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{a.title}</p>
                      <p className="text-[11px] uppercase tracking-wider text-white/35">{a.date}</p>
                    </div>
                  </div>
                  <p className="mt-2.5 text-xs leading-relaxed text-white/55">{a.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <TestStyles />
    </div>
  )
}
