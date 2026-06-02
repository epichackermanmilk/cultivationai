'use client'

import { useState, useEffect, useRef } from 'react'
import Link        from 'next/link'
import TokenWidget from '@/components/TokenWidget'
import Footer      from '@/components/Footer'
import { useAuth } from '@/lib/auth-context'
import { matchesSearch } from '@/lib/search'

// ─────────────────────────────────────────────────────────────────────────────
type Phase = 'select' | 'active' | 'dead' | 'survived' | 'error'

interface Novel  { slug: string; title: string; author?: string; total_chapters?: number }
interface PastRun { runNumber: number; turnsReached: number; deathReason: string }
interface Player { name: string; background: string; cultivationLevel: string; startingPosition: string }
interface Turn   { turn: number; action: string; narration: string }

const MAX_TURNS    = 50
const MAX_ATTEMPTS = 5     // matches server cap
const GAME_COST    = 50

const ARC_PRESETS = [
  { label: 'Opening Arc',   from: 1,   to: 50  },
  { label: 'Early Story',   from: 51,  to: 150 },
  { label: 'Mid Story',     from: 151, to: 300 },
  { label: 'Late Story',    from: 301, to: 500 },
  { label: 'Custom Range',  from: 0,   to: 0   },
]

// ─────────────────────────────────────────────────────────────────────────────
export default function SurvivalPage() {
  const { user, updateTokens } = useAuth()

  // Selection state
  const [novelQuery,     setNovelQuery]     = useState('')
  const [novels,         setNovels]         = useState<Novel[]>([])
  const [novelResults,   setNovelResults]   = useState<Novel[]>([])
  const [selectedNovel,  setSelectedNovel]  = useState<Novel | null>(null)
  const [showNovelDrop,  setShowNovelDrop]  = useState(false)
  const [arcPreset,      setArcPreset]      = useState(0)
  const [customFrom,     setCustomFrom]     = useState('')
  const [customTo,       setCustomTo]       = useState('')
  const novelRef = useRef<HTMLDivElement>(null)

  // Game state
  const [phase,         setPhase]         = useState<Phase>('select')
  const [sessionId,     setSessionId]     = useState<string | null>(null)
  const [player,        setPlayer]        = useState<Player | null>(null)
  const [openingText,   setOpeningText]   = useState('')
  const [challenge,     setChallenge]     = useState('')
  const [turns,         setTurns]         = useState<Turn[]>([])
  const [currentTurn,   setCurrentTurn]   = useState(1)
  const [runNumber,     setRunNumber]     = useState(1)
  const [pastRuns,      setPastRuns]      = useState<PastRun[]>([])
  const [arcLabel,      setArcLabel]      = useState('')
  const [action,        setAction]        = useState('')
  const [streaming,     setStreaming]     = useState(false)
  const [narration,     setNarration]     = useState('')
  const [deathReason,   setDeathReason]   = useState('')
  const [memOpen,       setMemOpen]       = useState(false)
  const [starting,      setStarting]      = useState(false)
  const [restarting,    setRestarting]    = useState(false)
  const [error,         setError]         = useState('')

  const actionRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load novels
  useEffect(() => {
    fetch('/api/novels').then(r => r.json()).then((data: Novel[] | { novels?: Novel[] }) => {
      setNovels(Array.isArray(data) ? data : (data.novels ?? []))
    }).catch(() => {})
  }, [])

  // Filter novels
  useEffect(() => {
    if (!novelQuery.trim()) { setNovelResults([]); return }
    setNovelResults(novels.filter(n => matchesSearch(n.title, novelQuery) || matchesSearch(n.author ?? '', novelQuery)).slice(0, 8))
  }, [novelQuery, novels])

  // Close dropdown on outside click
  useEffect(() => {
    function h(e: MouseEvent) {
      if (novelRef.current && !novelRef.current.contains(e.target as Node)) setShowNovelDrop(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Scroll to bottom on new narration
  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [narration, turns])

  // Focus textarea when active and not streaming
  useEffect(() => {
    if (phase === 'active' && !streaming && actionRef.current) actionRef.current.focus()
  }, [phase, streaming, currentTurn])

  const selectedArc = ARC_PRESETS[arcPreset]
  const arcFrom = selectedArc.from === 0 ? (parseInt(customFrom) || 1) : selectedArc.from
  const arcTo   = selectedArc.to   === 0 ? (parseInt(customTo)  || arcFrom + 50) : selectedArc.to
  const canStart = !!selectedNovel && arcFrom > 0 && arcTo > arcFrom

  // ── Start game ──────────────────────────────────────────────────────────────
  async function startGame() {
    if (!user || !selectedNovel || !canStart) return
    setStarting(true); setError('')
    try {
      const r = await fetch('/api/games/survival/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          novelSlug:   selectedNovel.slug,
          novelTitle:  selectedNovel.title,
          novelAuthor: selectedNovel.author ?? '',
          arcLabel:    selectedArc.from === 0 ? `Chapters ${arcFrom}–${arcTo}` : selectedArc.label,
          chapterFrom: arcFrom,
          chapterTo:   arcTo,
        }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error ?? 'Failed to start.'); return }

      updateTokens(user.tokens - GAME_COST)
      setSessionId(d.sessionId)
      setPlayer(d.player)
      setOpeningText(d.openingNarration)
      setChallenge(d.immediateChallenge)
      setArcLabel(d.arcLabel)
      setCurrentTurn(1)
      setTurns([])
      setRunNumber(1)
      setPastRuns([])
      setNarration('')
      setPhase('active')
    } catch { setError('Network error.') }
    finally { setStarting(false) }
  }

  // ── Submit action ───────────────────────────────────────────────────────────
  async function submitAction() {
    if (!action.trim() || !sessionId || streaming) return
    setStreaming(true); setNarration(''); setError('')
    const myAction = action.trim(); setAction('')

    try {
      const r = await fetch('/api/games/survival/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action: myAction }),
      })
      if (!r.ok) { const d = await r.json(); setError(d.error ?? 'Action failed.'); setStreaming(false); return }

      const reader = r.body!.getReader(); const decoder = new TextDecoder()
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setNarration(full)
      }

      const isDead    = /\[DEATH:/i.test(full)
      const isSurvive = /\[SURVIVED\]/i.test(full)
      const runEnds   = isDead || isSurvive || currentTurn >= MAX_TURNS

      const deathStr = isDead ? (full.match(/\[DEATH:\s*([^\]]+)\]/i)?.[1] ?? 'unknown') : ''
      setTurns(prev => [...prev, { turn: currentTurn, action: myAction, narration: full }])
      setNarration('')

      if (isSurvive) setPhase('survived')
      else if (runEnds) { setPhase('dead'); setDeathReason(deathStr) }
      else setCurrentTurn(t => t + 1)
    } catch { setError('Network error during action.') }
    finally { setStreaming(false) }
  }

  // ── Try again (regress) ─────────────────────────────────────────────────────
  async function tryAgain() {
    if (!sessionId) return
    setRestarting(true); setError('')
    try {
      const r = await fetch('/api/games/survival/regress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error ?? 'Failed to restart.'); return }

      setPastRuns(d.pastRuns)
      setRunNumber(d.runNumber)
      setPlayer(d.player)
      setOpeningText(d.openingNarration)
      setChallenge('')
      setCurrentTurn(1)
      setTurns([])
      setNarration('')
      setDeathReason('')
      setPhase('active')
      setMemOpen(true)
    } catch { setError('Network error.') }
    finally { setRestarting(false) }
  }

  const turnPct = Math.min(100, ((currentTurn - 1) / MAX_TURNS) * 100)

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--nc-border)] bg-[var(--nc-bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/games" className="text-zinc-400 hover:text-zinc-200 transition text-sm">← Games</Link>
            <div className="h-4 w-px bg-zinc-700" />
            <div className="flex items-center gap-2">
              <span className="text-base">📖</span>
              <span className="font-bold text-emerald-400 text-sm">Survival in the Novel</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {(phase === 'active' || phase === 'dead') && (
              <span className="text-xs text-zinc-500">
                Attempt {runNumber}/{MAX_ATTEMPTS} · Turn {Math.min(currentTurn, MAX_TURNS)}/{MAX_TURNS}
              </span>
            )}
            <TokenWidget />
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-8">

        {/* ── SELECT ─────────────────────────────────────────────────────────── */}
        {phase === 'select' && (
          <div className="max-w-xl mx-auto">
            <div className="mb-8 text-center">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-500/70">📖 Transmigrate</p>
              <h1 className="text-3xl font-bold tracking-tight mb-3" style={{ color: 'var(--nc-text)' }}>
                Survival in the Novel
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
                Pick a novel from our library. Pick an arc. Wake up inside it as a side character.
                Survive 50 turns using your knowledge of the story.
                The more you know the plot, the longer you live.
              </p>
            </div>

            <div className="space-y-5">
              {/* Novel picker */}
              <div ref={novelRef} className="relative">
                <label className="block text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">Choose a Novel</label>
                <input
                  type="text"
                  placeholder="Search our library…"
                  value={novelQuery}
                  onChange={e => { setNovelQuery(e.target.value); setShowNovelDrop(true); setSelectedNovel(null) }}
                  onFocus={() => setShowNovelDrop(true)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-emerald-500/50 transition"
                />
                {showNovelDrop && novelResults.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl overflow-hidden">
                    {novelResults.map(n => (
                      <button key={n.slug} onMouseDown={() => { setSelectedNovel(n); setNovelQuery(n.title); setShowNovelDrop(false) }}
                        className="w-full text-left px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-800 transition flex items-baseline justify-between gap-2">
                        <span className="truncate font-medium">{n.title}</span>
                        {n.author && <span className="text-xs text-zinc-600 shrink-0">{n.author}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {selectedNovel && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
                    <span className="text-emerald-400 text-xs">✓</span>
                    <span className="text-xs text-emerald-300 font-medium">{selectedNovel.title}</span>
                    {selectedNovel.author && <span className="text-xs text-zinc-600">by {selectedNovel.author}</span>}
                    {selectedNovel.total_chapters && <span className="ml-auto text-xs text-zinc-600">{selectedNovel.total_chapters.toLocaleString()} ch</span>}
                  </div>
                )}
              </div>

              {/* Arc picker */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">Choose an Arc</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ARC_PRESETS.map((arc, i) => (
                    <button key={i} onClick={() => setArcPreset(i)}
                      className={`rounded-xl border px-3 py-2.5 text-xs font-medium transition text-left ${
                        arcPreset === i
                          ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400'
                          : 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                      }`}>
                      <p className="font-semibold">{arc.label}</p>
                      {arc.from > 0 && <p className="text-zinc-600 text-[10px] mt-0.5">Ch. {arc.from}–{arc.to}</p>}
                    </button>
                  ))}
                </div>
                {arcPreset === 4 && (
                  <div className="mt-3 flex gap-2 items-center">
                    <input type="number" placeholder="From ch." min={1} value={customFrom}
                      onChange={e => setCustomFrom(e.target.value)}
                      className="w-28 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/50 transition" />
                    <span className="text-zinc-600 text-sm">to</span>
                    <input type="number" placeholder="To ch." min={1} value={customTo}
                      onChange={e => setCustomTo(e.target.value)}
                      className="w-28 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/50 transition" />
                  </div>
                )}
              </div>

              {/* Info box */}
              <div className="rounded-xl border border-zinc-800 p-4" style={{ background: 'var(--nc-bg2)' }}>
                <ul className="space-y-1.5 text-xs" style={{ color: 'var(--nc-text2)' }}>
                  <li className="flex gap-2"><span className="text-emerald-400 shrink-0">▸</span>You wake up as a side character — present in the story, not the MC.</li>
                  <li className="flex gap-2"><span className="text-emerald-400 shrink-0">▸</span>Survive 50 turns to win. Death lets you try again — up to {MAX_ATTEMPTS} attempts per session.</li>
                  <li className="flex gap-2"><span className="text-emerald-400 shrink-0">▸</span>The AI pulls real chapter context to keep events lore-accurate.</li>
                  <li className="flex gap-2"><span className="text-emerald-400 shrink-0 font-bold">💎</span><span className="font-semibold text-emerald-400">{GAME_COST} tokens — all {MAX_ATTEMPTS} attempts included.</span></li>
                </ul>
              </div>

              {error && <p className="text-sm text-rose-400 text-center">{error}</p>}

              {!user ? (
                <Link href="/library" className="block text-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-8 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20 transition">
                  Sign in to play
                </Link>
              ) : (
                <button onClick={startGame} disabled={!canStart || starting}
                  className="w-full rounded-xl px-8 py-3.5 text-sm font-bold text-black transition hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: canStart ? '0 6px 20px rgba(16,185,129,0.25)' : 'none' }}>
                  {starting ? (
                    <><span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent inline-block mr-2" />Generating your character…</>
                  ) : `📖 Enter the Novel — ${GAME_COST} tokens`}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── ACTIVE / DEAD ──────────────────────────────────────────────────── */}
        {(phase === 'active' || phase === 'dead') && player && (
          <div className="space-y-5">
            {/* Character + progress bar */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/70 mb-0.5">
                    {selectedNovel?.title} · {arcLabel}
                  </p>
                  <p className="text-sm font-bold text-emerald-300">{player.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{player.cultivationLevel} · {player.startingPosition}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-zinc-500">Turn</p>
                  <p className="text-2xl font-black text-emerald-400">{Math.min(currentTurn, MAX_TURNS)}<span className="text-sm font-normal text-zinc-600">/{MAX_TURNS}</span></p>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${turnPct}%` }} />
              </div>
            </div>

            {/* Past runs memory */}
            {pastRuns.length > 0 && (
              <div className="rounded-xl border border-zinc-800 overflow-hidden">
                <button onClick={() => setMemOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-zinc-800/50 transition"
                  style={{ background: 'var(--nc-bg2)', color: 'var(--nc-text)' }}>
                  <span>📚 Previous Attempts ({pastRuns.length})</span>
                  <span className="text-zinc-500 text-xs">{memOpen ? '▲' : '▼'}</span>
                </button>
                {memOpen && (
                  <div className="divide-y divide-zinc-800">
                    {pastRuns.map(r => (
                      <div key={r.runNumber} className="px-4 py-3" style={{ background: 'var(--nc-bg2)' }}>
                        <p className="text-xs font-semibold text-emerald-400 mb-1">Attempt {r.runNumber} — survived {r.turnsReached} turns</p>
                        <p className="text-xs text-zinc-500">Died: {r.deathReason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Opening text */}
            {openingText && turns.length === 0 && !streaming && (
              <div className="rounded-xl border border-zinc-800 p-4" style={{ background: 'var(--nc-bg2)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-2">
                  {runNumber > 1 ? `Attempt ${runNumber} — New Awakening` : 'You Wake Up'}
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--nc-text)' }}>{openingText}</p>
                {challenge && <p className="mt-3 text-xs italic text-emerald-400/70">{challenge}</p>}
              </div>
            )}

            {/* Turn history */}
            {turns.length > 0 && (
              <div className="space-y-4">
                {turns.map(t => (
                  <div key={t.turn} className="rounded-xl border border-zinc-800 overflow-hidden">
                    <div className="px-4 py-2 border-b border-zinc-800 flex items-center gap-2" style={{ background: 'var(--nc-bg2)' }}>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500/70">Turn {t.turn}</span>
                      <span className="text-xs text-zinc-500 truncate">↳ {t.action}</span>
                    </div>
                    <div className="px-4 py-3" style={{ background: 'var(--nc-bg2)' }}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--nc-text)' }}>{t.narration}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Streaming */}
            {streaming && (
              <div className="rounded-xl border border-emerald-500/20 p-4" style={{ background: 'var(--nc-bg2)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500/70 mb-2">Turn {currentTurn}</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--nc-text)' }}>
                  {narration}<span className="animate-pulse ml-0.5">▋</span>
                </p>
              </div>
            )}
            <div ref={bottomRef} />

            {/* Dead state */}
            {phase === 'dead' && !streaming && (
              runNumber >= MAX_ATTEMPTS ? (
                /* Attempts exhausted */
                <div className="rounded-2xl border border-zinc-700 bg-zinc-900/50 p-5 text-center">
                  <div className="mb-3 text-4xl select-none">☠️</div>
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Out of Attempts</p>
                  <p className="text-sm mb-4" style={{ color: 'var(--nc-text2)' }}>
                    You used all {MAX_ATTEMPTS} attempts and couldn&apos;t survive this arc. The novel&apos;s world
                    is unforgiving — try a different novel or an earlier arc where you know the plot better.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button onClick={() => { setPhase('select'); setSessionId(null); setTurns([]); setPlayer(null); setSelectedNovel(null); setNovelQuery('') }}
                      className="rounded-xl px-8 py-3 text-sm font-bold text-black transition hover:-translate-y-0.5"
                      style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                      Enter Another Novel — {GAME_COST} tokens
                    </button>
                    <Link href="/games" className="rounded-xl border border-zinc-700 px-8 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 transition text-center">
                      Back to Games
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-2">You Died</p>
                  {deathReason && <p className="text-sm mb-2" style={{ color: 'var(--nc-text2)' }}>Cause: {deathReason}</p>}
                  <p className="text-xs mb-1 text-zinc-600">You survived {turns.length} of {MAX_TURNS} turns.</p>
                  <p className="text-xs mb-4 text-emerald-400/80">
                    {MAX_ATTEMPTS - runNumber} {MAX_ATTEMPTS - runNumber === 1 ? 'attempt' : 'attempts'} remaining
                  </p>
                  <button onClick={tryAgain} disabled={restarting}
                    className="rounded-xl px-8 py-3 text-sm font-bold text-black transition hover:-translate-y-0.5 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                    {restarting ? '…' : `📖 Try Again — Attempt ${runNumber + 1}`}
                  </button>
                </div>
              )
            )}

            {/* Action input */}
            {phase === 'active' && !streaming && (
              <div className="sticky bottom-4">
                <div className="rounded-2xl border border-zinc-700 bg-[var(--nc-bg)] p-4 shadow-xl">
                  <label className="block text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">
                    Turn {currentTurn} — What do you do?
                  </label>
                  <textarea ref={actionRef} value={action} onChange={e => setAction(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitAction() }}
                    placeholder="Describe your action, approach, or response to the situation…"
                    maxLength={800} rows={3}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition resize-none" />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-zinc-600">{action.length}/800 · Ctrl+Enter</span>
                    <button onClick={submitAction} disabled={!action.trim()}
                      className="rounded-xl px-5 py-2 text-sm font-bold text-black transition hover:opacity-90 disabled:opacity-40"
                      style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                      Act
                    </button>
                  </div>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-rose-400 text-center">{error}</p>}
          </div>
        )}

        {/* ── SURVIVED ────────────────────────────────────────────────────────── */}
        {phase === 'survived' && (
          <div className="text-center py-10 max-w-xl mx-auto">
            <div className="mb-6 text-6xl select-none">🏆</div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-500/70">ARC COMPLETE</p>
            <h2 className="text-3xl font-bold mb-3" style={{ color: 'var(--nc-text)' }}>You Survived.</h2>
            <p className="text-sm mb-8 leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
              You navigated {turns.length} turns inside <strong>{selectedNovel?.title}</strong> as {player?.name} and made it out alive.
              {runNumber > 1 && ` It took ${runNumber} attempts.`}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => { setPhase('select'); setSessionId(null); setTurns([]); setPlayer(null); setSelectedNovel(null); setNovelQuery('') }}
                className="rounded-xl px-8 py-3 text-sm font-bold text-black transition hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                Enter Another Novel — {GAME_COST} tokens
              </button>
              <Link href="/games" className="rounded-xl border border-zinc-700 px-8 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 transition text-center">
                Back to Games
              </Link>
            </div>
          </div>
        )}

      </main>
      <Footer />
    </div>
  )
}
