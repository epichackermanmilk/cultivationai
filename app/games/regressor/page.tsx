'use client'

import { useState, useRef, useEffect } from 'react'
import Link        from 'next/link'
import TokenWidget from '@/components/TokenWidget'
import Footer      from '@/components/Footer'
import { useAuth } from '@/lib/auth-context'

// ─────────────────────────────────────────────────────────────────────────────
type Phase = 'lobby' | 'active' | 'run_end' | 'victory' | 'error'

interface PastRun {
  runNumber:      number
  turnsReached:   number
  endReason:      string
  lessonsLearned: string
}

interface Disaster { name: string; description: string; hint: string }

interface Turn { turn: number; action: string; narration: string }

const MAX_TURNS = 30
const MAX_RUNS  = 6   // total lives per session (matches server cap)

// ─────────────────────────────────────────────────────────────────────────────
export default function RegressorPage() {
  const { user, updateTokens } = useAuth()

  const [phase,          setPhase]          = useState<Phase>('lobby')
  const [sessionId,      setSessionId]      = useState<string | null>(null)
  const [disaster,       setDisaster]       = useState<Disaster | null>(null)
  const [worldContext,   setWorldContext]   = useState('')
  const [openingText,    setOpeningText]    = useState('')
  const [currentTurn,    setCurrentTurn]    = useState(1)
  const [currentRun,     setCurrentRun]     = useState(1)
  const [turns,          setTurns]          = useState<Turn[]>([])
  const [pastRuns,       setPastRuns]       = useState<PastRun[]>([])
  const [action,         setAction]         = useState('')
  const [streaming,      setStreaming]      = useState(false)
  const [currentNarration, setCurrentNarration] = useState('')
  const [lessonsText,    setLessonsText]    = useState('')
  const [regressLoading, setRegressLoading] = useState(false)
  const [memoryOpen,     setMemoryOpen]     = useState(false)
  const [starting,       setStarting]       = useState(false)
  const [error,          setError]          = useState('')

  const narrativeRef = useRef<HTMLDivElement>(null)
  const actionRef    = useRef<HTMLTextAreaElement>(null)
  const bottomRef    = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (bottomRef.current && (streaming || currentNarration)) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [currentNarration, streaming])

  useEffect(() => {
    if (phase === 'active' && actionRef.current && !streaming) {
      actionRef.current.focus()
    }
  }, [phase, streaming, currentTurn])

  // ── Start new game ──────────────────────────────────────────────────────────
  async function startGame() {
    if (!user) { setError('Sign in to play.'); return }
    setStarting(true); setError('')
    try {
      const r = await fetch('/api/games/regressor/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error ?? 'Failed to start.'); return }
      updateTokens(user.tokens - 50)
      setSessionId(d.sessionId)
      setDisaster(d.disaster)
      setWorldContext(d.worldContext)
      setOpeningText(d.openingNarration)
      setCurrentTurn(1)
      setCurrentRun(1)
      setTurns([])
      setPastRuns([])
      setCurrentNarration('')
      setPhase('active')
    } catch { setError('Network error.') }
    finally { setStarting(false) }
  }

  // ── Submit action ───────────────────────────────────────────────────────────
  async function submitAction() {
    if (!action.trim() || !sessionId || streaming) return
    setStreaming(true); setCurrentNarration(''); setError('')
    const myAction = action.trim()
    setAction('')

    try {
      const r = await fetch('/api/games/regressor/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action: myAction }),
      })
      if (!r.ok) { const d = await r.json(); setError(d.error ?? 'Action failed.'); setStreaming(false); return }

      const reader  = r.body!.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setCurrentNarration(full)
      }

      // Parse outcome
      const isDeath    = /\[DEATH:/i.test(full)
      const isVictory  = /\[VICTORY:/i.test(full)
      const isDisaster = /\[DISASTER\]/i.test(full)
      const runEnds    = isDeath || isVictory || isDisaster || currentTurn >= MAX_TURNS

      const newTurn: Turn = { turn: currentTurn, action: myAction, narration: full }
      setTurns(prev => [...prev, newTurn])
      setCurrentNarration('')

      if (isVictory) {
        setPhase('victory')
      } else if (runEnds) {
        setPhase('run_end')
      } else {
        setCurrentTurn(t => t + 1)
      }
    } catch { setError('Network error during action.') }
    finally { setStreaming(false) }
  }

  // ── Regress (start next run) ────────────────────────────────────────────────
  async function regress() {
    if (!sessionId) return
    setRegressLoading(true); setError('')
    try {
      const r = await fetch('/api/games/regressor/regress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error ?? 'Regression failed.'); return }

      setLessonsText(d.lessonsLearned)
      setPastRuns(d.pastRuns)
      setCurrentRun(d.newRunNumber)
      setCurrentTurn(1)
      setTurns([])
      setCurrentNarration('')
      setOpeningText('')
      setPhase('active')
      setMemoryOpen(true) // auto-open memory on new run
    } catch { setError('Network error.') }
    finally { setRegressLoading(false) }
  }

  const turnPct = ((currentTurn - 1) / MAX_TURNS) * 100

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--nc-border)] bg-[var(--nc-bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/games" className="text-zinc-400 hover:text-zinc-200 transition text-sm">← Games</Link>
            <div className="h-4 w-px bg-zinc-700" />
            <div className="flex items-center gap-2">
              <span className="text-base">⚔️</span>
              <span className="font-bold text-violet-400 text-sm">Regressor Challenge</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {(phase === 'active' || phase === 'run_end') && (
              <span className="text-xs text-zinc-500">
                Life {currentRun}/{MAX_RUNS} · Day {Math.min(currentTurn, MAX_TURNS)}/{MAX_TURNS}
              </span>
            )}
            <TokenWidget />
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-8">

        {/* ── LOBBY ─────────────────────────────────────────────────────────── */}
        {phase === 'lobby' && (
          <div className="text-center max-w-xl mx-auto">
            <div className="mb-6 text-5xl select-none">⚔️</div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-violet-500/70">THE REGRESSION</p>
            <h1 className="text-3xl font-bold tracking-tight mb-3" style={{ color: 'var(--nc-text)' }}>
              Regressor Challenge
            </h1>
            <p className="text-sm mb-8 leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
              You will die. Over and over. The Great Disaster claims everything in 30 days —
              unless you figure out how to stop it. Each death carries memories into the next life.
              Eventually, you will know enough to win.
            </p>

            <div className="mb-8 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 text-left space-y-2.5">
              <p className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-3">How it works</p>
              {[
                'The AI generates a unique disaster — a threat only you know is coming.',
                'Each turn: describe your action. The AI narrates the result.',
                'If you die or the 30-day clock expires: the life ends.',
                `You get ${MAX_RUNS} lives. Memories carry forward — each life you know more.`,
                'Figure out the root cause. Stop the disaster before your lives run out.',
              ].map(s => (
                <div key={s} className="flex items-start gap-2 text-xs" style={{ color: 'var(--nc-text2)' }}>
                  <span className="text-violet-400 shrink-0 mt-0.5">▸</span>{s}
                </div>
              ))}
            </div>

            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5">
              <span className="text-xs font-bold text-violet-400">50 tokens · 6 lives included</span>
            </div>

            {error && <p className="mb-4 text-sm text-rose-400">{error}</p>}

            {!user ? (
              <Link href="/library" className="inline-flex items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/10 px-8 py-3 text-sm font-bold text-violet-300 hover:bg-violet-500/20 transition">
                Sign in to play
              </Link>
            ) : (
              <button onClick={startGame} disabled={starting}
                className="inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)', boxShadow: '0 6px 20px rgba(124,58,237,0.3)' }}>
                {starting ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Generating Disaster…</>
                ) : '⚔️ Begin — 50 tokens'}
              </button>
            )}
          </div>
        )}

        {/* ── ACTIVE / RUN_END ──────────────────────────────────────────────── */}
        {(phase === 'active' || phase === 'run_end') && disaster && (
          <div className="space-y-5">

            {/* Disaster banner */}
            <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500/70 mb-1">The Great Disaster</p>
                  <p className="text-base font-bold text-violet-300">{disaster.name}</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--nc-text2)' }}>{disaster.description}</p>
                </div>
                {/* Countdown */}
                <div className="text-right shrink-0">
                  <p className="text-2xl font-black text-violet-400">{Math.max(0, MAX_TURNS - currentTurn + 1)}</p>
                  <p className="text-[10px] text-zinc-600">days left</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full rounded-full bg-violet-500 transition-all duration-500"
                  style={{ width: `${turnPct}%` }} />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-zinc-700">
                <span>Day 1</span><span>Day {MAX_TURNS}</span>
              </div>
            </div>

            {/* Memory accordion */}
            {pastRuns.length > 0 && (
              <div className="rounded-xl border border-zinc-800 overflow-hidden">
                <button
                  onClick={() => setMemoryOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-zinc-800/50 transition"
                  style={{ background: 'var(--nc-bg2)', color: 'var(--nc-text)' }}>
                  <span>⚡ Memories from Past Lives ({pastRuns.length})</span>
                  <span className="text-zinc-500 text-xs">{memoryOpen ? '▲' : '▼'}</span>
                </button>
                {memoryOpen && (
                  <div className="border-t border-zinc-800 divide-y divide-zinc-800">
                    {pastRuns.map(r => (
                      <div key={r.runNumber} className="px-4 py-3" style={{ background: 'var(--nc-bg2)' }}>
                        <p className="text-xs font-semibold text-violet-400 mb-1">
                          Life {r.runNumber} — reached Day {r.turnsReached}
                          <span className="ml-2 text-zinc-600 font-normal">
                            ({r.endReason === 'death' ? 'died' : r.endReason === 'disaster' ? 'disaster struck' : 'time expired'})
                          </span>
                        </p>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--nc-text2)' }}>{r.lessonsLearned}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Opening text (first turn of new run) */}
            {openingText && turns.length === 0 && !streaming && (
              <div className="rounded-xl border border-zinc-800 p-4" style={{ background: 'var(--nc-bg2)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-2">
                  Life {currentRun} Begins
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--nc-text)' }}>
                  {openingText}
                </p>
                <p className="mt-3 text-xs italic text-zinc-600">
                  Hint from your last memory: &ldquo;{disaster.hint}&rdquo;
                </p>
              </div>
            )}

            {/* Turn history */}
            {turns.length > 0 && (
              <div className="space-y-4" ref={narrativeRef}>
                {turns.map(t => (
                  <div key={t.turn} className="rounded-xl border border-zinc-800 overflow-hidden">
                    <div className="px-4 py-2 border-b border-zinc-800 flex items-center gap-2" style={{ background: 'var(--nc-bg2)' }}>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-violet-500/70">Day {t.turn}</span>
                      <span className="text-xs text-zinc-500 truncate">↳ {t.action}</span>
                    </div>
                    <div className="px-4 py-3" style={{ background: 'var(--nc-bg2)' }}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--nc-text)' }}>
                        {t.narration}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Streaming narration */}
            {streaming && (
              <div className="rounded-xl border border-violet-500/20 p-4" style={{ background: 'var(--nc-bg2)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-500/70 mb-2">
                  Day {currentTurn} — Unfolding…
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--nc-text)' }}>
                  {currentNarration}
                  <span className="animate-pulse ml-0.5">▋</span>
                </p>
              </div>
            )}
            <div ref={bottomRef} />

            {/* Run end state */}
            {phase === 'run_end' && !streaming && (
              currentRun >= MAX_RUNS ? (
                /* Lives exhausted — campaign over */
                <div className="rounded-2xl border border-zinc-700 bg-zinc-900/50 p-5 text-center">
                  <div className="mb-3 text-4xl select-none">⏳</div>
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">The Cycle Ends</p>
                  <p className="text-sm mb-4" style={{ color: 'var(--nc-text2)' }}>
                    You&apos;ve lived all {MAX_RUNS} lives. The heavens grant no more regressions —
                    the disaster claims this timeline. Begin a new cycle to try a fresh disaster.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button onClick={() => { setPhase('lobby'); setDisaster(null); setTurns([]); setPastRuns([]); setCurrentRun(1); setCurrentTurn(1) }}
                      className="rounded-xl px-8 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5"
                      style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)' }}>
                      New Disaster — 50 tokens
                    </button>
                    <Link href="/games" className="rounded-xl border border-zinc-700 px-8 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 transition text-center">
                      Back to Games
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-2">Life {currentRun} Ended</p>
                  <p className="text-sm mb-1" style={{ color: 'var(--nc-text2)' }}>
                    You reached Day {currentTurn}. These memories will follow you into your next life.
                  </p>
                  <p className="text-xs mb-4 text-violet-400/80">
                    {MAX_RUNS - currentRun} {MAX_RUNS - currentRun === 1 ? 'life' : 'lives'} remaining
                  </p>
                  <button onClick={regress} disabled={regressLoading}
                    className="rounded-xl px-8 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)' }}>
                    {regressLoading
                      ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent inline-block mr-2" />Processing memories…</>
                      : '⚔️ Regress — Begin Life ' + (currentRun + 1)}
                  </button>
                </div>
              )
            )}

            {/* Action input */}
            {phase === 'active' && !streaming && (
              <div className="sticky bottom-4">
                <div className="rounded-2xl border border-zinc-700 bg-[var(--nc-bg)] p-4 shadow-xl">
                  <label className="block text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">
                    Day {currentTurn} — What do you do?
                  </label>
                  <textarea
                    ref={actionRef}
                    value={action}
                    onChange={e => setAction(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitAction() }}
                    placeholder="Describe your action, investigation, or plan…"
                    maxLength={800}
                    rows={3}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition resize-none"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-zinc-600">{action.length}/800 · Ctrl+Enter</span>
                    <button onClick={submitAction} disabled={!action.trim()}
                      className="rounded-xl px-5 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
                      style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)' }}>
                      Act
                    </button>
                  </div>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-rose-400 text-center">{error}</p>}
          </div>
        )}

        {/* ── VICTORY ───────────────────────────────────────────────────────── */}
        {phase === 'victory' && disaster && (
          <div className="text-center max-w-xl mx-auto py-10">
            <div className="mb-6 text-6xl select-none">🏆</div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-500/70">DISASTER PREVENTED</p>
            <h2 className="text-3xl font-bold mb-3" style={{ color: 'var(--nc-text)' }}>
              You Won.
            </h2>
            <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
              In Life {currentRun}, you stopped <strong>{disaster.name}</strong>.
              After {turns.length} days of struggle, the future changed.
            </p>
            {pastRuns.length > 0 && (
              <p className="text-xs mb-8 text-zinc-600">
                It took {currentRun} {currentRun === 1 ? 'life' : 'lives'}.
              </p>
            )}
            {/* Recent turns */}
            {turns.slice(-3).map(t => (
              <div key={t.turn} className="mb-3 rounded-xl border border-zinc-800 p-4 text-left" style={{ background: 'var(--nc-bg2)' }}>
                <p className="text-[10px] font-bold text-violet-400 mb-1">Day {t.turn}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--nc-text2)' }}>{t.narration.slice(0, 300)}{t.narration.length > 300 ? '…' : ''}</p>
              </div>
            ))}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <button onClick={() => { setPhase('lobby'); setDisaster(null); setTurns([]); setPastRuns([]); setCurrentRun(1); setCurrentTurn(1) }}
                className="rounded-xl px-8 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)' }}>
                New Disaster — 50 tokens
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
