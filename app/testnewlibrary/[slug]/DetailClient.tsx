'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { coverSrc } from '@/lib/cover'

interface Meta {
  slug: string; title: string; author: string; total_chapters: number
  genres: string[]; cover_url: string; description: string
}
interface Chapter { chapter_number: number; chapter_title: string }
interface SimNovel { slug: string; title: string; cover_url: string; genres: string[]; sim: number }
type RGB = [number, number, number]

function useDominantColor(src: string): RGB {
  const [rgb, setRgb] = useState<RGB>([124, 58, 237])
  useEffect(() => {
    if (!src) return
    let cancelled = false
    const img = new Image(); img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); const w = (c.width = 48), h = (c.height = 48)
        const ctx = c.getContext('2d', { willReadFrequently: true })!; ctx.drawImage(img, 0, 0, w, h)
        const d = ctx.getImageData(0, 0, w, h).data
        let r = 0, g = 0, b = 0, n = 0
        for (let i = 0; i < d.length; i += 4) {
          const R = d[i], G = d[i + 1], B = d[i + 2], max = Math.max(R, G, B), min = Math.min(R, G, B)
          const sat = max === 0 ? 0 : (max - min) / max
          if (max < 40 || min > 215 || sat < 0.22) continue
          r += R; g += G; b += B; n++
        }
        if (n > 0 && !cancelled) setRgb([Math.round(r / n), Math.round(g / n), Math.round(b / n)])
      } catch { /* keep default */ }
    }
    img.src = src
    return () => { cancelled = true }
  }, [src])
  return rgb
}
const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

export default function DetailClient({ meta }: { meta: Meta }) {
  const accent = useDominantColor(coverSrc(meta.cover_url))
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [chLoading, setChLoading] = useState(true)
  const [chQuery, setChQuery] = useState('')
  const [chSort, setChSort] = useState<'newest' | 'oldest'>('newest')
  const [chPage, setChPage] = useState(1)
  const [similar, setSimilar] = useState<SimNovel[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [codex, setCodex] = useState<any>(null)
  const [descOpen, setDescOpen] = useState(false)

  useEffect(() => {
    fetch(`/api/testnewlibrary/chapters/${meta.slug}`).then(r => r.json())
      .then(d => { setChapters(d.chapters ?? []); setChLoading(false) }).catch(() => setChLoading(false))
    fetch(`/api/knowledge/${meta.slug}`).then(r => r.json()).then(setCodex).catch(() => {})
    fetch('/api/novels/all').then(r => r.json()).then((all: (SimNovel & { locked?: boolean })[]) => {
      const mine = new Set((meta.genres ?? []).map(g => g.toLowerCase()))
      if (!mine.size) return
      const scored = all.filter(n => n.slug !== meta.slug && !n.locked)
        .map(n => ({ ...n, sim: (n.genres ?? []).filter(g => mine.has(g.toLowerCase())).length / mine.size }))
        .filter(n => n.sim > 0).sort((a, b) => b.sim - a.sim).slice(0, 6)
      setSimilar(scored as SimNovel[])
    }).catch(() => {})
  }, [meta.slug, meta.genres])

  const chFiltered = useMemo(() => {
    let list = chapters
    if (chQuery.trim()) {
      const q = chQuery.toLowerCase()
      list = list.filter(c => String(c.chapter_number).includes(q) || (c.chapter_title ?? '').toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => chSort === 'newest' ? b.chapter_number - a.chapter_number : a.chapter_number - b.chapter_number)
  }, [chapters, chQuery, chSort])

  // Paginate — long novels (some 3,000+ chapters) made the page enormous.
  const CH_PER = 100
  const chPages = Math.max(1, Math.ceil(chFiltered.length / CH_PER))
  const page = Math.min(chPage, chPages)
  const chSlice = chFiltered.slice((page - 1) * CH_PER, page * CH_PER)
  useEffect(() => { setChPage(1) }, [chQuery, chSort])

  // Compact page numbers with ellipses: 1 … p-1 p p+1 … N
  const pageNums: (number | '…')[] = (() => {
    if (chPages <= 7) return Array.from({ length: chPages }, (_, i) => i + 1)
    const out: (number | '…')[] = [1]
    const lo = Math.max(2, page - 1), hi = Math.min(chPages - 1, page + 1)
    if (lo > 2) out.push('…')
    for (let i = lo; i <= hi; i++) out.push(i)
    if (hi < chPages - 1) out.push('…')
    out.push(chPages)
    return out
  })()

  const ps = codex?.power_system
  const protag = codex?.protagonist
  const goodFor = useMemo(() => {
    const g = (meta.genres ?? []).slice(0, 2).join(' & ')
    const sys = ps?.name ? ` and ${ps.name.replace(/ (system|cultivation)$/i, '')}-style progression` : ''
    return g ? `Readers who love ${g}${sys}.` : ''
  }, [meta.genres, ps])

  return (
    <div className="tnld relative min-h-screen text-white" style={{ ['--v' as string]: `${accent[0]},${accent[1]},${accent[2]}` }}>
      {/* Living background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" style={{ background: '#07060d' }}>
        <img src={coverSrc(meta.cover_url)} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: 'blur(70px) saturate(1.3)', transform: 'scale(1.3)', opacity: 0.3 }} />
        <div className="absolute inset-0" style={{
          background: `radial-gradient(120% 70% at 50% -10%, ${rgba(accent, 0.5)} 0%, transparent 55%),
                       linear-gradient(180deg, rgba(7,6,13,0.4) 0%, #07060d 75%)` }} />
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-50 tnld-glass">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-3 px-4 sm:px-6">
          <Link href="/testnewlibrary" className="flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white">
            <span className="text-lg">‹</span> Library
          </Link>
          <span className="ml-auto truncate text-sm font-medium text-white/50">{meta.title}</span>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1200px] px-4 pb-24 sm:px-6">
        {/* Hero */}
        <section className="grid grid-cols-1 gap-6 pt-8 sm:grid-cols-[260px_1fr]">
          <div className="mx-auto w-full max-w-[260px] sm:mx-0">
            <div className="aspect-[3/4] overflow-hidden rounded-2xl ring-1 ring-white/15" style={{ boxShadow: `0 24px 60px ${rgba(accent, 0.5)}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverSrc(meta.cover_url)} alt={meta.title} className="h-full w-full object-cover" />
            </div>
            {/* Stats card */}
            <div className="tnld-panel mt-4 grid grid-cols-2 gap-px overflow-hidden">
              {[['Chapters', (meta.total_chapters || 0).toLocaleString()], ['Characters', codex?.character_count ?? '—'],
                ['Status', 'Ongoing'], ['Type', meta.genres?.[0] ?? 'Novel']].map(([k, v]) => (
                <div key={k} className="bg-white/[0.03] px-3 py-3 text-center">
                  <p className="text-base font-bold" style={{ color: 'rgb(var(--v))' }}>{v as string}</p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-wide text-white/45">{k}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(meta.genres ?? []).map(g => <span key={g} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-white/70">{g}</span>)}
            </div>
          </div>

          <div className="min-w-0">
            <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">{meta.title}</h1>
            <p className="mt-2 text-sm text-white/55">by {meta.author || 'Unknown'}</p>
            {meta.description && (
              <div className="mt-4">
                <p className={`text-[15px] leading-relaxed text-white/75 ${descOpen ? '' : 'line-clamp-4'}`}>{meta.description}</p>
                {meta.description.length > 240 && (
                  <button onClick={() => setDescOpen(o => !o)} className="mt-1 text-xs font-semibold" style={{ color: 'rgb(var(--v))' }}>{descOpen ? 'Show less' : 'Show more'}</button>
                )}
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link href={`/testnewlibrary/${meta.slug}/read/1`} className="rounded-xl px-5 py-2.5 text-sm font-bold transition hover:brightness-110"
                style={{ background: 'rgb(var(--v))', boxShadow: `0 0 24px ${rgba(accent, 0.55)}` }}>Read first chapter</Link>
              <button className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold backdrop-blur transition hover:bg-white/10">＋ Bookmark</button>
              <Link href={`/testrecommend`} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold backdrop-blur transition hover:bg-white/10">Recommend Similar</Link>
            </div>

            {/* ── Codex Insight (unique feature) ─────────────────────────────── */}
            <div className="tnld-panel mt-6 p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-black" style={{ background: 'rgb(var(--v))' }}>✦</span>
                <h3 className="text-sm font-bold uppercase tracking-wider">Codex Insight</h3>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/50">AI · grounded in the text</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Insight label="Power system" value={ps?.name ?? '—'} sub={ps?.ladder?.length ? `${ps.ladder.length}-tier progression` : ps?.type} />
                <Insight label="Protagonist" value={protag?.name ?? '—'} sub={protag?.one_line} />
                <Insight label="Core tags" value={(meta.genres ?? []).slice(0, 3).join(' · ') || '—'} />
                <Insight label="Good for" value={goodFor || '—'} />
              </div>
            </div>
          </div>
        </section>

        {/* Chapters + Similar */}
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          {/* Chapter list */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">{chapters.length ? `${chapters.length.toLocaleString()} Chapters` : 'Chapters'}</h2>
              <button onClick={() => setChSort(s => s === 'newest' ? 'oldest' : 'newest')}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/10">
                {chSort === 'newest' ? '↓ Newest' : '↑ Oldest'}
              </button>
            </div>
            <input value={chQuery} onChange={e => setChQuery(e.target.value)} placeholder="Search chapters…"
              className="mb-3 h-10 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white placeholder-white/40 outline-none backdrop-blur transition focus:border-[rgba(var(--v),0.6)]" />
            <div className="tnld-panel divide-y divide-white/5">
              {chLoading ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="p-3.5"><div className="tnld-skel h-4 w-2/3 rounded" /></div>)
                : chSlice.map(c => (
                  <Link key={c.chapter_number} href={`/testnewlibrary/${meta.slug}/read/${c.chapter_number}`}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.04]">
                    <span className="w-12 shrink-0 text-xs font-bold" style={{ color: 'rgb(var(--v))' }}>#{c.chapter_number}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-white/85">{c.chapter_title || `Chapter ${c.chapter_number}`}</span>
                    <span className="shrink-0 text-white/25">›</span>
                  </Link>
                ))}
              {!chLoading && chFiltered.length === 0 && <p className="p-6 text-center text-sm text-white/40">No chapters match.</p>}
            </div>

            {/* Pager — 100 chapters per page */}
            {!chLoading && chPages > 1 && (
              <div className="mt-4 flex flex-col items-center gap-2">
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <button onClick={() => setChPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-30">‹</button>
                  {pageNums.map((p, i) => p === '…'
                    ? <span key={`e${i}`} className="px-1.5 text-sm text-white/35">…</span>
                    : <button key={p} onClick={() => setChPage(p)}
                        className="h-8 min-w-8 rounded-lg border px-2 text-sm font-semibold transition"
                        style={p === page
                          ? { background: 'rgb(var(--v))', borderColor: 'transparent', color: '#fff' }
                          : { borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}>{p}</button>
                  )}
                  <button onClick={() => setChPage(p => Math.min(chPages, p + 1))} disabled={page === chPages}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-30">›</button>
                </div>
                <p className="text-xs text-white/40">
                  Showing {((page - 1) * CH_PER + 1).toLocaleString()}–{Math.min(page * CH_PER, chFiltered.length).toLocaleString()} of {chFiltered.length.toLocaleString()}
                </p>
              </div>
            )}
          </section>

          {/* Similar novels */}
          <section>
            <h2 className="mb-3 text-lg font-bold">Similar Novels</h2>
            <div className="tnld-panel space-y-1 p-3">
              {similar.length === 0 ? <p className="p-4 text-center text-sm text-white/40">Finding matches…</p>
                : similar.map(n => (
                  <Link key={n.slug} href={`/testnewlibrary/${n.slug}`} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverSrc(n.cover_url)} alt={n.title} loading="lazy" className="h-16 w-12 shrink-0 rounded-lg object-cover ring-1 ring-white/10" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{n.title}</p>
                      <p className="truncate text-[11px] text-white/50">{(n.genres ?? []).slice(0, 2).join(', ')}</p>
                    </div>
                    <span className="shrink-0 text-xs font-bold" style={{ color: 'rgb(var(--v))' }}>{Math.round(n.sim * 100)}%</span>
                  </Link>
                ))}
            </div>
          </section>
        </div>
      </main>

      <style jsx global>{`
        .tnld-glass { background: rgba(10,8,18,0.6); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.07); }
        .tnld-panel { background: rgba(18,15,30,0.55); border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; backdrop-filter: blur(12px); box-shadow: 0 20px 50px rgba(0,0,0,0.4); }
        @keyframes tnld-sh { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
        .tnld-skel { background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 37%, rgba(255,255,255,0.04) 63%); background-size: 400% 100%; animation: tnld-sh 1.4s ease infinite; }
      `}</style>
    </div>
  )
}

function Insight({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-snug">{value}</p>
      {sub && <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-white/55">{sub}</p>}
    </div>
  )
}
