'use client'

import { useState, useEffect, useRef } from 'react'
import Link   from 'next/link'
import TokenWidget from '@/components/TokenWidget'
import Footer      from '@/components/Footer'
import { useAuth } from '@/lib/auth-context'
import { matchesSearch } from '@/lib/search'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Novel { slug: string; title: string; author?: string }
interface Character { name: string }

interface Fighter {
  name:       string
  novelSlug:  string
  novelTitle: string
  maxChapter: string   // empty string = all chapters
}

interface BattleResult {
  narrative:  string
  winner:     'A' | 'B' | 'draw'
  winnerName: string
  reasoning:  string
  closeness:  string
}

type Phase = 'select' | 'fighting' | 'result' | 'error'

const CLOSENESS_LABEL: Record<string, string> = {
  dominant:       'Dominant victory',
  moderate:       'Clear advantage',
  close:          'Close fight',
  extremely_close:'Razor\'s edge',
}

// ─────────────────────────────────────────────────────────────────────────────
// Fighter Panel
// ─────────────────────────────────────────────────────────────────────────────
function FighterPanel({
  label,
  accentColor,
  fighter,
  onChange,
}: {
  label:        'A' | 'B'
  accentColor:  string
  fighter:      Fighter
  onChange:     (f: Partial<Fighter>) => void
}) {
  const [novelQuery,    setNovelQuery]    = useState('')
  const [novels,        setNovels]        = useState<Novel[]>([])
  const [novelResults,  setNovelResults]  = useState<Novel[]>([])
  const [loadingNovels, setLoadingNovels] = useState(false)
  const [characters,    setCharacters]    = useState<Character[]>([])
  const [charQuery,     setCharQuery]     = useState('')
  const [charResults,   setCharResults]   = useState<Character[]>([])
  const [loadingChars,  setLoadingChars]  = useState(false)
  const [showNovelDrop, setShowNovelDrop] = useState(false)
  const [showCharDrop,  setShowCharDrop]  = useState(false)
  const novelRef = useRef<HTMLDivElement>(null)
  const charRef  = useRef<HTMLDivElement>(null)

  // Load novel list once
  useEffect(() => {
    fetch('/api/novels').then(r => r.json()).then((data: Novel[] | { novels?: Novel[] }) => {
      const list = Array.isArray(data) ? data : (data.novels ?? [])
      setNovels(list)
    }).catch(() => {})
  }, [])

  // Filter novels by query
  useEffect(() => {
    if (!novelQuery.trim()) { setNovelResults([]); return }
    setNovelResults(novels.filter(n => matchesSearch(n.title, novelQuery) || matchesSearch(n.author ?? '', novelQuery)).slice(0, 8))
  }, [novelQuery, novels])

  // Load characters when novel selected
  useEffect(() => {
    if (!fighter.novelSlug) { setCharacters([]); return }
    setLoadingChars(true)
    setCharacters([])
    setCharQuery('')
    fetch(`/api/character/${fighter.novelSlug}`)
      .then(r => r.json())
      .then((d: { featured?: { name: string }[]; community?: { name: string }[]; characters?: string[] }) => {
        const names: string[] = []
        if (d.featured)   names.push(...d.featured.map((c: { name: string }) => c.name))
        if (d.community)  names.push(...d.community.map((c: { name: string }) => c.name))
        if (d.characters && names.length === 0) names.push(...d.characters)
        setCharacters([...new Set(names)].map(n => ({ name: n })))
      })
      .catch(() => {})
      .finally(() => setLoadingChars(false))
  }, [fighter.novelSlug])

  // Filter characters
  useEffect(() => {
    if (!charQuery.trim()) { setCharResults(characters.slice(0, 8)); return }
    setCharResults(characters.filter(c => matchesSearch(c.name, charQuery)).slice(0, 8))
  }, [charQuery, characters])

  // Close dropdowns on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (novelRef.current && !novelRef.current.contains(e.target as Node)) setShowNovelDrop(false)
      if (charRef.current  && !charRef.current.contains(e.target as Node))  setShowCharDrop(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const selectNovel = (novel: Novel) => {
    onChange({ novelSlug: novel.slug, novelTitle: novel.title, name: '' })
    setNovelQuery(novel.title)
    setShowNovelDrop(false)
    setCharQuery('')
  }

  const selectChar = (char: Character) => {
    onChange({ name: char.name })
    setCharQuery(char.name)
    setShowCharDrop(false)
  }

  const accentBorder = label === 'A' ? 'border-amber-500/40' : 'border-violet-500/40'
  const accentText   = label === 'A' ? 'text-amber-400'      : 'text-violet-400'
  const accentBg     = label === 'A' ? 'bg-amber-500/10'     : 'bg-violet-500/10'

  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-4 ${accentBorder}`} style={{ background: 'var(--nc-bg2)' }}>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-black uppercase tracking-widest ${accentText}`}>Fighter {label}</span>
        {fighter.name && fighter.novelSlug && (
          <span className="text-xs text-zinc-500">✓ Ready</span>
        )}
      </div>

      {/* Novel search */}
      <div ref={novelRef} className="relative">
        <label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wider">Novel</label>
        <input
          type="text"
          placeholder="Search novels…"
          value={novelQuery}
          onChange={e => { setNovelQuery(e.target.value); setShowNovelDrop(true); onChange({ novelSlug: '', novelTitle: '', name: '' }); setCharQuery('') }}
          onFocus={() => setShowNovelDrop(true)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500/50 transition"
        />
        {showNovelDrop && novelResults.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl overflow-hidden">
            {novelResults.map(novel => (
              <button
                key={novel.slug}
                onMouseDown={() => selectNovel(novel)}
                className="w-full text-left px-3 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 transition flex items-baseline justify-between gap-2"
              >
                <span className="truncate">{novel.title}</span>
                {novel.author && <span className="text-xs text-zinc-600 shrink-0">{novel.author}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Character search */}
      <div ref={charRef} className="relative">
        <label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wider">Character</label>
        {!fighter.novelSlug ? (
          <div className="rounded-lg border border-dashed border-zinc-700 px-3 py-2 text-sm text-zinc-600">
            Select a novel first
          </div>
        ) : (
          <>
            <input
              type="text"
              placeholder={loadingChars ? 'Loading characters…' : 'Search or type a name…'}
              value={charQuery}
              onChange={e => { setCharQuery(e.target.value); setShowCharDrop(true); onChange({ name: e.target.value }) }}
              onFocus={() => { setShowCharDrop(true); if (!charQuery) setCharResults(characters.slice(0, 8)) }}
              disabled={loadingChars}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500/50 transition disabled:opacity-50"
            />
            {showCharDrop && charResults.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl overflow-hidden">
                {charResults.map(c => (
                  <button
                    key={c.name}
                    onMouseDown={() => selectChar(c)}
                    className="w-full text-left px-3 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 transition"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Chapter range */}
      <div>
        <label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wider">
          As of chapter <span className="text-zinc-600 font-normal">(optional — leave blank for full novel)</span>
        </label>
        <input
          type="number"
          min={1}
          placeholder="e.g. 150"
          value={fighter.maxChapter}
          onChange={e => onChange({ maxChapter: e.target.value })}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500/50 transition"
        />
      </div>

      {/* Selected summary */}
      {fighter.name && fighter.novelSlug && (
        <div className={`rounded-lg border px-3 py-2 text-xs ${accentBorder} ${accentBg}`}>
          <p className={`font-bold ${accentText}`}>{fighter.name}</p>
          <p className="text-zinc-400">{fighter.novelTitle}</p>
          {fighter.maxChapter && <p className="text-zinc-500">Up to chapter {fighter.maxChapter}</p>}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function CharacterBattlePage() {
  const { user, updateTokens } = useAuth()

  const [phase,   setPhase]   = useState<Phase>('select')
  const [error,   setError]   = useState('')
  const [result,  setResult]  = useState<BattleResult | null>(null)

  const [fighterA, setFighterA] = useState<Fighter>({ name: '', novelSlug: '', novelTitle: '', maxChapter: '' })
  const [fighterB, setFighterB] = useState<Fighter>({ name: '', novelSlug: '', novelTitle: '', maxChapter: '' })

  const bothReady = !!(fighterA.name && fighterA.novelSlug && fighterB.name && fighterB.novelSlug)

  async function startBattle() {
    if (!user) { setError('Sign in to play.'); return }
    if (!bothReady) return
    setPhase('fighting')
    setError('')

    try {
      const r = await fetch('/api/games/character-battle/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fighterA: {
            name:       fighterA.name,
            novelSlug:  fighterA.novelSlug,
            novelTitle: fighterA.novelTitle,
            maxChapter: fighterA.maxChapter ? parseInt(fighterA.maxChapter, 10) : null,
          },
          fighterB: {
            name:       fighterB.name,
            novelSlug:  fighterB.novelSlug,
            novelTitle: fighterB.novelTitle,
            maxChapter: fighterB.maxChapter ? parseInt(fighterB.maxChapter, 10) : null,
          },
        }),
      })

      const d = await r.json()
      if (!r.ok) {
        setError(d.error ?? 'Battle failed.')
        setPhase('select')
        return
      }

      updateTokens(user.tokens - 20)
      setResult(d)
      setPhase('result')
    } catch {
      setError('Network error — please try again.')
      setPhase('select')
    }
  }

  function newBattle() {
    setPhase('select')
    setResult(null)
    setError('')
    setFighterA({ name: '', novelSlug: '', novelTitle: '', maxChapter: '' })
    setFighterB({ name: '', novelSlug: '', novelTitle: '', maxChapter: '' })
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--nc-border)] bg-[var(--nc-bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/games" className="text-zinc-400 hover:text-zinc-200 transition text-sm">
              ← Games
            </Link>
            <div className="h-4 w-px bg-zinc-700" />
            <div className="flex items-center gap-2">
              <span className="text-base">⚡</span>
              <span className="font-bold text-orange-400 text-sm">Character Battle Debate</span>
            </div>
          </div>
          <TokenWidget />
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-10">

        {/* ── SELECT ────────────────────────────────────────────────────────── */}
        {phase === 'select' && (
          <div>
            <div className="mb-8 text-center">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-orange-500/70">⚡ Battle Arena</p>
              <h1 className="text-3xl font-bold tracking-tight mb-3" style={{ color: 'var(--nc-text)' }}>
                Character Battle Debate
              </h1>
              <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
                Pick two characters. Set a chapter range for each. The battle will be simulated
                using real lore from the novels — power levels, techniques, and all.
                Cross-novel matchups are chaotic and we love them.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 mb-6">
              <FighterPanel
                label="A"
                accentColor="amber"
                fighter={fighterA}
                onChange={f => setFighterA(prev => ({ ...prev, ...f }))}
              />

              {/* VS divider */}
              <div className="sm:hidden flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-zinc-700" />
                <span className="text-lg font-black text-zinc-500">VS</span>
                <div className="flex-1 h-px bg-zinc-700" />
              </div>

              <FighterPanel
                label="B"
                accentColor="violet"
                fighter={fighterB}
                onChange={f => setFighterB(prev => ({ ...prev, ...f }))}
              />
            </div>

            {/* VS divider (desktop only) */}
            <div className="hidden sm:flex items-center justify-center -mt-2 mb-4">
              <span className="text-2xl font-black text-zinc-600">VS</span>
            </div>

            {error && (
              <p className="mb-4 text-sm text-rose-400 text-center">{error}</p>
            )}

            <div className="text-center">
              {!user ? (
                <Link href="/library"
                  className="inline-flex items-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 px-8 py-3 text-sm font-bold text-orange-300 hover:bg-orange-500/20 transition">
                  Sign in to play
                </Link>
              ) : (
                <button
                  onClick={startBattle}
                  disabled={!bothReady}
                  className="inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-bold text-black transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
                  style={{ background: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)', boxShadow: bothReady ? '0 6px 20px rgba(249,115,22,0.25)' : 'none' }}
                >
                  ⚡ Begin Battle — 20 tokens
                </button>
              )}
              <p className="mt-2 text-xs text-zinc-600">
                {bothReady ? '20 tokens will be deducted' : 'Select both fighters to continue'}
              </p>
            </div>
          </div>
        )}

        {/* ── FIGHTING ──────────────────────────────────────────────────────── */}
        {phase === 'fighting' && (
          <div className="text-center py-20">
            <div className="mb-8 flex items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-lg font-bold text-amber-400">{fighterA.name}</p>
                <p className="text-xs text-zinc-500">{fighterA.novelTitle}</p>
              </div>
              <div className="text-3xl font-black text-zinc-500 animate-pulse">⚡</div>
              <div className="text-center">
                <p className="text-lg font-bold text-violet-400">{fighterB.name}</p>
                <p className="text-xs text-zinc-500">{fighterB.novelTitle}</p>
              </div>
            </div>
            <div className="flex justify-center mb-6">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            </div>
            <p className="text-sm text-zinc-500">Consulting the lore…</p>
            <p className="text-xs text-zinc-600 mt-2">Analysing power levels, techniques, and battle records</p>
          </div>
        )}

        {/* ── RESULT ────────────────────────────────────────────────────────── */}
        {phase === 'result' && result && (
          <div>
            {/* Winner banner */}
            <div className="mb-8 rounded-2xl overflow-hidden border border-orange-500/30"
              style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.12) 0%, rgba(194,65,12,0.06) 100%)' }}>
              <div className="p-6 text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-orange-500/70 mb-2">
                  {CLOSENESS_LABEL[result.closeness] ?? 'Battle Complete'}
                </p>
                <p className="text-4xl font-black mb-1" style={{ color: 'var(--nc-text)' }}>
                  {result.winner === 'draw' ? 'Draw' : result.winnerName}
                </p>
                {result.winner !== 'draw' && (
                  <p className="text-sm text-zinc-400 mb-4">
                    wins as{' '}
                    {result.winner === 'A'
                      ? `${fighterA.name} from "${fighterA.novelTitle}"`
                      : `${fighterB.name} from "${fighterB.novelTitle}"`}
                    {(result.winner === 'A' ? fighterA.maxChapter : fighterB.maxChapter)
                      ? ` (ch. ${result.winner === 'A' ? fighterA.maxChapter : fighterB.maxChapter})` : ''}
                  </p>
                )}
                <p className="text-sm leading-relaxed max-w-lg mx-auto" style={{ color: 'var(--nc-text2)' }}>
                  {result.reasoning}
                </p>
              </div>

              {/* Fighter badges */}
              <div className="border-t border-orange-500/20 grid grid-cols-2">
                <div className={`p-4 text-center ${result.winner === 'A' ? 'bg-amber-500/10' : ''}`}>
                  <p className={`font-bold text-sm ${result.winner === 'A' ? 'text-amber-400' : 'text-zinc-500'}`}>
                    {result.winner === 'A' ? '🏆 ' : ''}{fighterA.name}
                  </p>
                  <p className="text-xs text-zinc-600 truncate">{fighterA.novelTitle}</p>
                  {fighterA.maxChapter && <p className="text-xs text-zinc-700">ch. 1–{fighterA.maxChapter}</p>}
                </div>
                <div className={`p-4 text-center border-l border-orange-500/20 ${result.winner === 'B' ? 'bg-violet-500/10' : ''}`}>
                  <p className={`font-bold text-sm ${result.winner === 'B' ? 'text-violet-400' : 'text-zinc-500'}`}>
                    {result.winner === 'B' ? '🏆 ' : ''}{fighterB.name}
                  </p>
                  <p className="text-xs text-zinc-600 truncate">{fighterB.novelTitle}</p>
                  {fighterB.maxChapter && <p className="text-xs text-zinc-700">ch. 1–{fighterB.maxChapter}</p>}
                </div>
              </div>
            </div>

            {/* Battle narrative */}
            <div className="rounded-2xl border border-[var(--nc-border)] p-6 mb-8" style={{ background: 'var(--nc-bg2)' }}>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">⚡ Battle Narrative</p>
              {result.narrative.split('\n').filter(Boolean).map((para, i) => (
                <p key={i} className="text-sm leading-relaxed mb-4 last:mb-0" style={{ color: 'var(--nc-text)' }}>
                  {para}
                </p>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={newBattle}
                className="rounded-xl px-8 py-3 text-sm font-bold text-black transition hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)' }}
              >
                New Battle — 20 tokens
              </button>
              <Link
                href="/games"
                className="rounded-xl border border-zinc-700 px-8 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 transition text-center"
              >
                Back to Games
              </Link>
            </div>
          </div>
        )}

        {/* ── ERROR ─────────────────────────────────────────────────────────── */}
        {phase === 'error' && (
          <div className="text-center">
            <p className="text-rose-400 mb-4">{error}</p>
            <button onClick={() => setPhase('select')} className="rounded-lg border border-zinc-700 px-6 py-2 text-sm text-zinc-300">
              Back
            </button>
          </div>
        )}

      </main>

      <Footer />
    </div>
  )
}
