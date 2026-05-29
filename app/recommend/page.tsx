'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import TokenWidget from '@/components/TokenWidget'
import Footer      from '@/components/Footer'
import { useAuth } from '@/lib/auth-context'

const G: React.CSSProperties = {
  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
}

interface Novel {
  slug: string; title: string; author: string
  total_chapters: number; genres: string[]; cover_url: string; description: string
}
interface Rec extends Novel { blurb: string }

// ── Novel search picker ───────────────────────────────────────────────────────
function NovelPicker({
  library, selected, onAdd, onRemove,
}: {
  library: Novel[]
  selected: Novel[]
  onAdd: (n: Novel) => void
  onRemove: (slug: string) => void
}) {
  const [query, setQuery]     = useState('')
  const [open, setOpen]       = useState(false)
  const wrapRef               = useRef<HTMLDivElement>(null)

  const selectedSlugs = new Set(selected.map(n => n.slug))
  const filtered = query.length > 1
    ? library.filter(n =>
        !selectedSlugs.has(n.slug) &&
        (n.title.toLowerCase().includes(query.toLowerCase()) ||
         n.author.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 8)
    : []

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={wrapRef} className="relative">
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selected.map(n => (
            <span key={n.slug}
              className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
              {n.title.length > 30 ? n.title.slice(0, 28) + '…' : n.title}
              <button onClick={() => onRemove(n.slug)} className="ml-0.5 text-amber-400/60 hover:text-amber-400 transition">×</button>
            </span>
          ))}
        </div>
      )}

      {selected.length < 5 && (
        <div className="relative">
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder="Search novels by title or author…"
            className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-bg2)] px-4 py-3 text-sm placeholder-zinc-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
            style={{ color: 'var(--nc-text)' }}
          />
          {open && filtered.length > 0 && (
            <div className="absolute z-30 mt-1 w-full rounded-xl border border-[var(--nc-border)] shadow-2xl overflow-hidden"
              style={{ background: 'var(--nc-bg2)' }}>
              {filtered.map(n => (
                <button key={n.slug}
                  onClick={() => { onAdd(n); setQuery(''); setOpen(false) }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-zinc-800/60">
                  <img src={n.cover_url} alt={n.title}
                    className="h-10 w-7 shrink-0 rounded object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium" style={{ color: 'var(--nc-text)' }}>{n.title}</p>
                    <p className="text-xs" style={{ color: 'var(--nc-text2)' }}>{n.author} · {n.genres[0]}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {selected.length >= 5 && (
        <p className="text-xs text-zinc-500">Maximum 5 novels selected</p>
      )}
    </div>
  )
}

// ── Recommendation card ───────────────────────────────────────────────────────
function RecCard({ rec }: { rec: Rec }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-[var(--nc-border)] p-4 transition hover:border-amber-500/30"
      style={{ background: 'var(--nc-bg2)' }}>
      {/* Cover */}
      <Link href={`/novel/${rec.slug}`} className="shrink-0">
        <img
          src={rec.cover_url} alt={rec.title}
          className="h-32 w-22 rounded-lg object-cover shadow-lg transition hover:scale-105"
          style={{ width: '88px' }}
          onError={e => {
            const t = e.target as HTMLImageElement
            t.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(rec.title)}&size=120&background=27272a&color=f59e0b&bold=true`
          }}
        />
      </Link>

      {/* Info */}
      <div className="flex min-w-0 flex-col gap-1.5">
        <div>
          <Link href={`/novel/${rec.slug}`}>
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug transition hover:text-amber-400"
              style={{ color: 'var(--nc-text)' }}>{rec.title}</h3>
          </Link>
          <p className="text-xs" style={{ color: 'var(--nc-text2)' }}>{rec.author}</p>
        </div>

        {/* Genres */}
        <div className="flex flex-wrap gap-1">
          {rec.genres.slice(0, 3).map(g => (
            <span key={g} className="rounded-full border px-2 py-0.5 text-[10px]"
              style={{ borderColor: 'var(--nc-border)', color: 'var(--nc-text2)' }}>{g}</span>
          ))}
          <span className="rounded-full border px-2 py-0.5 text-[10px]"
            style={{ borderColor: 'var(--nc-border)', color: 'var(--nc-text2)' }}>
            {rec.total_chapters.toLocaleString()} ch
          </span>
        </div>

        {/* AI blurb */}
        <p className="text-xs leading-relaxed italic" style={{ color: 'var(--nc-text2)' }}>
          &ldquo;{rec.blurb}&rdquo;
        </p>

        {/* CTA */}
        <Link href={`/novel/${rec.slug}`}
          className="mt-auto w-fit rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/20">
          View Novel →
        </Link>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RecommendPage() {
  const { user, updateTokens } = useAuth()
  const [mode, setMode]           = useState<'novels' | 'description'>('novels')
  const [library, setLibrary]     = useState<Novel[]>([])
  const [libLoading, setLibLoading] = useState(true)
  const [selected, setSelected]   = useState<Novel[]>([])
  const [query, setQuery]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [results, setResults]     = useState<Rec[] | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [spoilerSafe, setSpoilerSafe] = useState(false)

  // Load library for the picker
  useEffect(() => {
    fetch('/api/novels')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const novels = Array.isArray(data) ? data : []
        setLibrary(novels)
      })
      .catch(() => {})
      .finally(() => setLibLoading(false))
  }, [])

  async function getRecommendations() {
    if (loading) return
    if (mode === 'novels' && selected.length === 0) {
      setError('Select at least one novel you enjoy')
      return
    }
    if (mode === 'description' && !query.trim()) {
      setError('Describe what kind of novel you want')
      return
    }

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const body = mode === 'novels'
        ? { mode, slugs: selected.map(n => n.slug), spoilerSafe }
        : { mode, query: query.trim(), spoilerSafe }

      const res = await fetch('/api/recommend', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong — please try again')
        return
      }

      // Update token display
      const remaining = res.headers.get('X-Tokens-Remaining')
      if (remaining !== null) {
        const n = parseInt(remaining, 10)
        if (!isNaN(n)) updateTokens(n)
      }

      setResults(data.recommendations ?? [])
    } catch {
      setError('Could not reach the recommendation service — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col pb-16 sm:pb-0" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--nc-border)] bg-[var(--nc-bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/library" className="group shrink-0 flex items-center gap-3">
            <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-amber-400 group-hover:text-amber-300 transition">NovelCodex</h1>
              <p className="hidden lg:block text-xs text-zinc-500">Every secret, every character, every world — ask anything.</p>
            </div>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/chat"
              className="hidden sm:flex items-center whitespace-nowrap rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs font-medium text-amber-400/75 transition hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-400">
              ✦ Multi-Novel Chat
            </Link>
            <Link href="/library"
              className="hidden sm:flex items-center whitespace-nowrap rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs font-medium text-amber-400/75 transition hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-400">
              Library
            </Link>
            <Link href="/characters"
              className="hidden sm:flex items-center whitespace-nowrap rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs font-medium text-amber-400/75 transition hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-400">
              🎭 Characters
            </Link>
            <Link href="/recommend"
              className="hidden sm:flex items-center whitespace-nowrap rounded-lg border border-amber-500/60 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400">
              Recommend
            </Link>
            <Link href="/bookmarks"
              className="hidden sm:flex items-center whitespace-nowrap rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs font-medium text-amber-400/75 transition hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-400">
              Bookmarks
            </Link>
            <TokenWidget />
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-10">
        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2" style={G}>Discover Your Next Novel</h1>
          <p className="text-sm" style={{ color: 'var(--nc-text2)' }}>
            AI-powered recommendations · <span className="text-amber-400 font-medium">10 tokens</span> per search
          </p>
        </div>

        {/* Mode toggle */}
        <div className="mb-6 flex rounded-xl border border-[var(--nc-border)] p-1 gap-1"
          style={{ background: 'var(--nc-bg2)' }}>
          {([['novels', 'Based on novels I like'], ['description', 'Describe what I want']] as const).map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); setResults(null); setError(null) }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${mode === m ? 'bg-amber-500 text-black' : 'hover:bg-zinc-800/50'}`}
              style={mode !== m ? { color: 'var(--nc-text2)' } : {}}>
              {label}
            </button>
          ))}
        </div>

        {/* Input panel */}
        <div className="mb-6 rounded-2xl border border-[var(--nc-border)] p-5"
          style={{ background: 'var(--nc-bg2)' }}>
          {mode === 'novels' ? (
            <>
              <label className="mb-3 block text-sm font-medium" style={{ color: 'var(--nc-text)' }}>
                Select up to 5 novels you enjoy
              </label>
              {libLoading
                ? <div className="h-12 animate-pulse rounded-xl bg-zinc-800" />
                : <NovelPicker
                    library={library}
                    selected={selected}
                    onAdd={n => setSelected(prev => [...prev, n])}
                    onRemove={slug => setSelected(prev => prev.filter(n => n.slug !== slug))}
                  />
              }
            </>
          ) : (
            <>
              <label className="mb-3 block text-sm font-medium" style={{ color: 'var(--nc-text)' }}>
                Describe what you&apos;re looking for
              </label>
              <textarea
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="e.g. A slow-burn cultivation story with a clever MC who uses strategy over brute force, set in ancient China with political intrigue…"
                rows={4}
                maxLength={500}
                className="w-full resize-none rounded-xl border border-[var(--nc-border)] bg-[var(--nc-bg)] px-4 py-3 text-sm placeholder-zinc-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                style={{ color: 'var(--nc-text)' }}
              />
              <p className="mt-1 text-right text-xs text-zinc-600">{query.length}/500</p>
            </>
          )}
        </div>

        {/* Spoiler-safe toggle */}
        <div className="mb-5 rounded-xl border border-[var(--nc-border)] p-4"
          style={{ background: 'var(--nc-bg2)' }}>
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--nc-text)' }}>
                🛡️ Spoiler-safe mode
              </p>
              <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
                Blurbs will describe premise and tone only — no plot twists, deaths, or endings revealed.
              </p>
            </div>
            {/* iOS-style toggle */}
            <button
              type="button"
              onClick={() => setSpoilerSafe(v => !v)}
              className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 ${
                spoilerSafe
                  ? 'border-amber-500 bg-amber-500'
                  : 'border-zinc-600 bg-zinc-700'
              }`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                spoilerSafe ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </label>
          {spoilerSafe && (
            <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-amber-400/80">
              ⚠ Heads up: spoiler-safe blurbs may feel less compelling. Some novels hook readers specifically because of a key plot element (e.g. a shocking betrayal or a unique power) — hiding it might make the recommendation less exciting than it really is.
            </p>
          )}
        </div>

        {/* Auth gate */}
        {!user ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-center">
            <p className="mb-3 text-sm" style={{ color: 'var(--nc-text2)' }}>
              Sign in to get AI-powered recommendations
            </p>
            <Link href="/library"
              className="rounded-full bg-amber-500 px-6 py-2 text-sm font-semibold text-black hover:bg-amber-400 transition">
              Sign In
            </Link>
          </div>
        ) : (
          <button
            onClick={getRecommendations}
            disabled={loading}
            className="w-full rounded-xl py-3.5 text-sm font-bold text-black transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
            style={{ background: 'linear-gradient(135deg,#fbbf24 0%,#f59e0b 50%,#d97706 100%)', boxShadow: '0 6px 20px rgba(245,158,11,0.30)' }}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                Finding your next obsession…
              </span>
            ) : (
              '✨ Get Recommendations  (10 tokens)'
            )}
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {error}
            {error.includes('shop') && (
              <Link href="/shop" className="ml-2 font-semibold underline underline-offset-2">Go to Shop →</Link>
            )}
          </div>
        )}

        {/* Results */}
        {results !== null && (
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold" style={{ color: 'var(--nc-text)' }}>
                Your Recommendations
              </h2>
              <span className="text-xs" style={{ color: 'var(--nc-text2)' }}>{results.length} found</span>
            </div>

            {results.length === 0 ? (
              <div className="rounded-2xl border border-[var(--nc-border)] p-8 text-center text-sm" style={{ color: 'var(--nc-text2)' }}>
                No close matches found — try adjusting your selection or description.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {results.map(rec => <RecCard key={rec.slug} rec={rec} />)}
              </div>
            )}

            <button
              onClick={getRecommendations}
              disabled={loading}
              className="mt-6 w-full rounded-xl border border-[var(--nc-border)] py-3 text-sm font-medium transition hover:border-amber-500/50 hover:text-amber-400 disabled:opacity-40"
              style={{ color: 'var(--nc-text2)' }}>
              {loading ? 'Searching…' : 'Try Again  (10 tokens)'}
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
