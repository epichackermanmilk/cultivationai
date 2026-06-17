'use client'

// /testrecommend — AI recommendations, redesigned to the /test* standard. Cinematic
// hero, cover-art picker with quick-picks, spoiler-safe toggle, and rich result
// cards. Same backend as /recommend (/api/recommend, X-Tokens-Remaining). Signed-out
// users are sent to /testlogin?return=/testrecommend.

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import TestHeader from '@/components/TestHeader'
import { TestStyles, Cover, Skeleton, type Novel } from '@/components/TestUI'
import { useAuth } from '@/lib/auth-context'
import { matchesSearch } from '@/lib/search'

interface Rec extends Novel { blurb: string }

// ── Searchable cover picker with quick-picks ────────────────────────────────────────
function NovelPicker({ library, selected, onAdd, onRemove }: {
  library: Novel[]; selected: Novel[]; onAdd: (n: Novel) => void; onRemove: (slug: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const sel = new Set(selected.map(n => n.slug))
  const q = query.trim()
  const results = (q ? library.filter(n => !sel.has(n.slug) && (matchesSearch(n.title, q) || matchesSearch(n.author || '', q))) : []).slice(0, 8)
  const quickPicks = library.filter(n => !sel.has(n.slug)).slice(0, 8)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={wrap}>
      {/* Selected as cover chips */}
      {selected.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3">
          {selected.map(n => (
            <div key={n.slug} className="group relative w-[68px]">
              <Cover novel={n} className="aspect-[3/4] w-full rounded-lg ring-1 ring-[rgba(var(--v),0.5)]" />
              <button onClick={() => onRemove(n.slug)} title="Remove"
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/80 text-xs text-white ring-1 ring-white/20 transition hover:bg-red-500">×</button>
              <p className="mt-1 line-clamp-2 text-[10px] leading-tight text-white/60">{n.title}</p>
            </div>
          ))}
        </div>
      )}

      {selected.length < 5 ? (
        <div className="relative">
          <div className="relative">
            <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" strokeLinecap="round" /></svg>
            <input value={query} onChange={e => { setQuery(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)}
              placeholder="Search novels by title or author…"
              className="h-11 w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-3 text-sm text-white placeholder-white/35 outline-none transition focus:border-[rgba(var(--v),0.6)]" />
          </div>
          {open && results.length > 0 && (
            <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-white/10 bg-[#100d1c] shadow-2xl">
              {results.map(n => (
                <button key={n.slug} onClick={() => { onAdd(n); setQuery(''); setOpen(false) }}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-white/5">
                  <Cover novel={n} className="h-12 w-9 shrink-0 rounded ring-1 ring-white/10" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{n.title}</p>
                    <p className="truncate text-xs text-white/50">{n.author} · {n.genres?.[0]}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Quick-picks when nothing typed */}
          {!q && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Popular picks</p>
              <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-8">
                {quickPicks.map(n => (
                  <button key={n.slug} onClick={() => onAdd(n)} title={n.title} className="tnl-sheen group relative aspect-[3/4] overflow-hidden rounded-lg ring-1 ring-white/10 transition hover:ring-[rgba(var(--v),0.6)]">
                    <Cover novel={n} className="h-full w-full" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-2xl font-light text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">+</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : <p className="text-xs text-white/45">Maximum 5 novels selected</p>}
    </div>
  )
}

function RecCard({ rec, i }: { rec: Rec; i: number }) {
  return (
    <div className="tnl-panel tnl-fadeup flex gap-4 p-4" style={{ animationDelay: `${i * 60}ms` }}>
      <Link href={`/testnewlibrary/${rec.slug}`} className="shrink-0">
        <Cover novel={rec} className="h-40 w-[108px] rounded-lg ring-1 ring-white/10 transition hover:ring-[rgba(var(--v),0.6)]" />
      </Link>
      <div className="flex min-w-0 flex-col gap-1.5">
        <div>
          <Link href={`/testnewlibrary/${rec.slug}`}><h3 className="line-clamp-2 text-base font-bold leading-snug transition hover:text-[rgb(var(--v))]">{rec.title}</h3></Link>
          <p className="text-xs text-white/50">{rec.author}{rec.total_chapters ? ` · ${rec.total_chapters.toLocaleString()} ch` : ''}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {(rec.genres ?? []).slice(0, 3).map(g => <span key={g} className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/55">{g}</span>)}
        </div>
        <p className="text-sm italic leading-relaxed text-white/70">&ldquo;{rec.blurb}&rdquo;</p>
        <Link href={`/testnewlibrary/${rec.slug}`} className="mt-auto w-fit rounded-lg px-3.5 py-1.5 text-xs font-bold text-white transition hover:brightness-110" style={{ background: 'rgb(var(--v))' }}>View Novel →</Link>
      </div>
    </div>
  )
}

export default function TestRecommendPage() {
  const { user, updateTokens } = useAuth()
  const [mode, setMode] = useState<'novels' | 'description'>('novels')
  const [library, setLibrary] = useState<Novel[]>([])
  const [libLoading, setLibLoading] = useState(true)
  const [selected, setSelected] = useState<Novel[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Rec[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [spoilerSafe, setSpoilerSafe] = useState(false)

  useEffect(() => {
    fetch('/api/novels').then(r => r.ok ? r.json() : []).then(d => {
      setLibrary((Array.isArray(d) ? d : []).filter((n: Novel) => !('coming_soon' in n)))
    }).catch(() => {}).finally(() => setLibLoading(false))
  }, [])

  async function getRecommendations() {
    if (loading) return
    if (mode === 'novels' && selected.length === 0) { setError('Select at least one novel you enjoy'); return }
    if (mode === 'description' && !query.trim()) { setError('Describe what kind of novel you want'); return }
    setLoading(true); setError(null); setResults(null)
    try {
      const body = mode === 'novels' ? { mode, slugs: selected.map(n => n.slug), spoilerSafe } : { mode, query: query.trim(), spoilerSafe }
      const res = await fetch('/api/recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong — please try again'); return }
      const remaining = res.headers.get('X-Tokens-Remaining')
      if (remaining !== null) { const n = parseInt(remaining, 10); if (!isNaN(n)) updateTokens(n) }
      setResults(data.recommendations ?? [])
    } catch { setError('Could not reach the recommendation service — please try again') } finally { setLoading(false) }
  }

  return (
    <div className="tnl-root relative min-h-screen text-white" style={{ ['--v' as string]: '124,58,237' }}>
      <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: '#07060d' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(85% 55% at 50% -10%, rgba(var(--v),0.30) 0%, transparent 55%), radial-gradient(60% 50% at 85% 110%, rgba(var(--v),0.16) 0%, transparent 55%)' }} />
      </div>

      <TestHeader />

      <main className="relative z-10 mx-auto max-w-3xl px-4 pb-24 pt-14 sm:px-6">
        {/* Hero */}
        <div className="mb-9 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em]" style={{ color: 'rgb(var(--v))' }}>✦ AI Curator</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Discover your next obsession</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/55">
            Tell us what you love — our curator reads the lore of thousands of novels and finds the ones built for you.
            <span className="ml-1" style={{ color: 'rgb(var(--v))' }}>10 tokens</span> per search.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="mb-6 flex gap-1 rounded-2xl p-1 tnl-panel">
          {([['novels', '❤  Novels I like'], ['description', '✎  Describe what I want']] as const).map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); setResults(null); setError(null) }}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${mode === m ? 'text-white' : 'text-white/55 hover:text-white'}`}
              style={mode === m ? { background: 'rgb(var(--v))' } : {}}>{label}</button>
          ))}
        </div>

        {/* Input panel */}
        <div className="mb-6 tnl-panel p-5">
          {mode === 'novels' ? (
            <>
              <label className="mb-3 block text-sm font-medium">Pick up to 5 novels you enjoy</label>
              {libLoading ? <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-8">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-lg" />)}</div> :
                <NovelPicker library={library} selected={selected}
                  onAdd={n => setSelected(p => p.length < 5 ? [...p, n] : p)} onRemove={slug => setSelected(p => p.filter(n => n.slug !== slug))} />}
            </>
          ) : (
            <>
              <label className="mb-3 block text-sm font-medium">Describe what you&apos;re looking for</label>
              <textarea value={query} onChange={e => setQuery(e.target.value)} rows={4} maxLength={500}
                placeholder="e.g. A slow-burn cultivation story with a clever MC who uses strategy over brute force, set in ancient China with political intrigue…"
                className="w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/35 outline-none transition focus:border-[rgba(var(--v),0.6)]" />
              <p className="mt-1 text-right text-xs text-white/35">{query.length}/500</p>
            </>
          )}
        </div>

        {/* Spoiler-safe */}
        <div className="mb-5 tnl-panel p-4">
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">🛡️ Spoiler-safe mode</p>
              <p className="mt-0.5 text-xs leading-relaxed text-white/55">Blurbs describe premise and tone only — no plot twists, deaths, or endings revealed.</p>
            </div>
            <button type="button" onClick={() => setSpoilerSafe(v => !v)}
              className="relative h-6 w-11 shrink-0 rounded-full border transition-colors"
              style={spoilerSafe ? { borderColor: 'rgb(var(--v))', background: 'rgb(var(--v))' } : { borderColor: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)' }}>
              <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${spoilerSafe ? 'translate-x-5' : ''}`} />
            </button>
          </label>
        </div>

        {!user ? (
          <div className="rounded-2xl border border-[rgba(var(--v),0.25)] bg-[rgba(var(--v),0.06)] p-5 text-center">
            <p className="mb-3 text-sm text-white/70">Sign in to get AI-powered recommendations</p>
            <Link href="/testlogin?return=/testrecommend" className="inline-block rounded-full px-6 py-2 text-sm font-semibold transition hover:brightness-110" style={{ background: 'rgb(var(--v))' }}>Sign in</Link>
          </div>
        ) : (
          <button onClick={getRecommendations} disabled={loading}
            className="w-full rounded-xl py-3.5 text-sm font-bold transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
            style={{ background: 'rgb(var(--v))', boxShadow: '0 10px 30px rgba(var(--v),0.45)' }}>
            {loading ? <span className="flex items-center justify-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Finding your next obsession…</span> : '✨ Get Recommendations  (10 tokens)'}
          </button>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {error}{error.includes('shop') && <Link href="/shop" className="ml-2 font-semibold underline underline-offset-2">Go to Shop →</Link>}
          </div>
        )}

        {results !== null && (
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Your Recommendations</h2>
              <span className="text-xs text-white/50">{results.length} found</span>
            </div>
            {results.length === 0 ? (
              <div className="tnl-panel p-8 text-center text-sm text-white/55">No close matches found — try adjusting your selection or description.</div>
            ) : (
              <div className="flex flex-col gap-4">{results.map((rec, i) => <RecCard key={rec.slug} rec={rec} i={i} />)}</div>
            )}
            <button onClick={getRecommendations} disabled={loading}
              className="mt-6 w-full rounded-xl border border-white/10 py-3 text-sm font-medium text-white/70 transition hover:border-[rgba(var(--v),0.5)] hover:text-white disabled:opacity-40">
              {loading ? 'Searching…' : 'Try Again  (10 tokens)'}
            </button>
          </div>
        )}
      </main>

      <TestStyles />
    </div>
  )
}
