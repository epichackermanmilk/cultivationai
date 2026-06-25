'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import TestHeader from '@/components/TestHeader'
import GameAd from '@/components/GameAd'
import TestFooter from '@/components/TestFooter'
import { useAuth } from '@/lib/auth-context'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Quest {
  text:           string
  difficulty:     string
  pointValue:     number
  playerResponse: string | null
  judgment:       string | null
  survived:       boolean | null
}

type Phase = 'lobby' | 'quest' | 'judging' | 'complete' | 'error'

const DIFFICULTY_LABELS: Record<string, string> = {
  mildly_embarrassing:   'Tier I — Mildly Embarrassing',
  socially_catastrophic: 'Tier II — Socially Catastrophic',
  physically_risky:      'Tier III — Physically Risky',
  diplomatically_ruinous:'Tier IV — Diplomatically Ruinous',
  reality_breaking:      'Tier V — Reality Breaking',
}

const DIFFICULTY_COLORS: Record<string, string> = {
  mildly_embarrassing:   'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  socially_catastrophic: 'text-[#a78bfa] border-[rgb(124,58,237)]/30 bg-[rgb(124,58,237)]/10',
  physically_risky:      'text-orange-400 border-orange-500/30 bg-orange-500/10',
  diplomatically_ruinous:'text-rose-400 border-rose-500/30 bg-rose-500/10',
  reality_breaking:      'text-violet-400 border-violet-500/30 bg-violet-500/10',
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function DefectiveSystemPage() {
  const { user, updateTokens } = useAuth()

  const [phase,         setPhase]         = useState<Phase>('lobby')
  const [sessionId,     setSessionId]     = useState<string | null>(null)
  const [quests,        setQuests]        = useState<Quest[]>([])
  const [currentIndex,  setCurrentIndex]  = useState(0)
  const [survivedCount, setSurvivedCount] = useState(0)
  const [response,      setResponse]      = useState('')
  const [judgment,      setJudgment]      = useState('')
  const [isJudging,     setIsJudging]     = useState(false)
  const [currentSurvived, setCurrentSurvived] = useState<boolean | null>(null)
  const [error,         setError]         = useState('')
  const [starting,      setStarting]      = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const judgmentRef = useRef<HTMLDivElement>(null)

  const currentQuest = quests[currentIndex] ?? null

  // Focus textarea when quest loads
  useEffect(() => {
    if (phase === 'quest' && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [phase, currentIndex])

  // Scroll judgment into view as it streams
  useEffect(() => {
    if (isJudging && judgmentRef.current) {
      judgmentRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [judgment, isJudging])

  // ── Start game ──────────────────────────────────────────────────────────────
  async function startGame() {
    if (!user) { setError('Sign in to play.'); return }
    setStarting(true)
    setError('')

    try {
      const r = await fetch('/api/games/defective-system/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const d = await r.json()
      if (!r.ok) {
        setError(d.error ?? 'Failed to start game.')
        setStarting(false)
        return
      }

      // Deduct tokens optimistically
      updateTokens(user.tokens - 25)

      setSessionId(d.sessionId)
      setSurvivedCount(0)

      // Build placeholder quest array (we only have the first quest text)
      // We'll fill others as we go — actually start route returns all quest data? No, just first.
      // We store the full quests array in session state server-side.
      // On client we only know the current quest. We'll track individually.
      const firstQuest: Quest = {
        ...d.quest,
        playerResponse: null,
        judgment:       null,
        survived:       null,
      }
      setQuests([firstQuest])
      setCurrentIndex(0)
      setResponse('')
      setJudgment('')
      setCurrentSurvived(null)
      setPhase('quest')
    } catch {
      setError('Network error — please try again.')
    } finally {
      setStarting(false)
    }
  }

  // ── Submit response ─────────────────────────────────────────────────────────
  async function submitResponse() {
    if (!response.trim() || !sessionId || isJudging) return
    setIsJudging(true)
    setJudgment('')
    setCurrentSurvived(null)
    setPhase('judging')

    try {
      const r = await fetch('/api/games/defective-system/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, response: response.trim() }),
      })

      if (!r.ok) {
        const d = await r.json()
        setError(d.error ?? 'Judgment failed.')
        setPhase('quest')
        setIsJudging(false)
        return
      }

      const allDoneHeader = r.headers.get('X-All-Done') === 'true'

      const reader = r.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullText += chunk
        setJudgment(fullText)
      }

      // Parse survival from judgment text
      const survived = fullText.includes('[SYSTEM: QUEST SURVIVED')

      setCurrentSurvived(survived)
      if (survived) setSurvivedCount(c => c + 1)

      // Update the quest in our local array
      setQuests(prev => {
        const next = [...prev]
        next[currentIndex] = {
          ...next[currentIndex],
          playerResponse: response.trim(),
          judgment:       fullText,
          survived,
        }
        return next
      })

      if (allDoneHeader) {
        // All 5 quests done — wait a beat then go to complete
        setTimeout(() => {
          setPhase('complete')
          setIsJudging(false)
        }, 3000)
      }
      // Otherwise wait for user to click "Next Quest"
    } catch {
      setError('Network error during judgment.')
      setPhase('quest')
    } finally {
      setIsJudging(false)
    }
  }

  // ── Next quest ──────────────────────────────────────────────────────────────
  async function nextQuest() {
    if (!sessionId) return
    const nextIndex = currentIndex + 1

    if (nextIndex >= 5) {
      setPhase('complete')
      return
    }

    // Fetch next quest state from server (stored in session)
    // We need to get the next quest text from the server session
    try {
      const r = await fetch('/api/games/defective-system/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeSessionId: sessionId }),
      })
      const d = await r.json()
      if (!r.ok || !d.quest) {
        setPhase('complete')
        return
      }

      const nextQuest: Quest = {
        ...d.quest,
        playerResponse: null,
        judgment:       null,
        survived:       null,
      }

      setQuests(prev => {
        const arr = [...prev]
        arr[nextIndex] = nextQuest
        return arr
      })
      setCurrentIndex(nextIndex)
      setResponse('')
      setJudgment('')
      setCurrentSurvived(null)
      setPhase('quest')
    } catch {
      setPhase('complete')
    }
  }

  // ── Play again ──────────────────────────────────────────────────────────────
  function playAgain() {
    setPhase('lobby')
    setSessionId(null)
    setQuests([])
    setCurrentIndex(0)
    setSurvivedCount(0)
    setResponse('')
    setJudgment('')
    setCurrentSurvived(null)
    setError('')
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="tnl-root relative flex min-h-screen flex-col text-white" style={{ ["--v" as string]: "124,58,237" }}>
      <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: "#07060d" }}><div className="absolute inset-0" style={{ background: "radial-gradient(85% 50% at 50% -8%, rgba(var(--v),0.18) 0%, transparent 55%)" }} /></div>

      {/* Header */}
      <TestHeader />
      <GameAd />

      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-10">

        {/* ── LOBBY ──────────────────────────────────────────────────────────── */}
        {phase === 'lobby' && (
          <div className="text-center">
            <div className="mb-6 text-6xl select-none">⚠️</div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-rose-500/70">
              THE SYSTEM
            </p>
            <h1 className="text-3xl font-bold tracking-tight mb-3" style={{ color: 'rgba(255,255,255,0.92)' }}>
              The Defective System
            </h1>
            <p className="text-sm mb-8 max-w-md mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Congratulations. You have been selected by The System to complete five quests of escalating inadvisability.
              Compliance is mandatory. Refusal is not recognized as a valid input.
              Survival is not guaranteed. Point values are non-negotiable.
            </p>

            {/* System warning box */}
            <div className="mb-8 rounded-xl border border-rose-500/30 bg-rose-500/5 p-5 text-left max-w-md mx-auto">
              <p className="text-xs font-bold text-rose-400 mb-3 uppercase tracking-wider">⚠ System Notice</p>
              <ul className="space-y-2 text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                <li>• Five quests will be assigned in order of increasing severity.</li>
                <li>• You may submit any response. The System does not care if it is good.</li>
                <li>• Judgment is final. Appeals are not a supported feature.</li>
                <li>• Point values carry no practical benefit.</li>
                <li>• <span className="text-rose-400 font-semibold">Cost: 25 tokens (flat, regardless of how quickly you perish).</span></li>
              </ul>
            </div>

            {error && (
              <p className="mb-4 text-sm text-rose-400">{error}</p>
            )}

            {!user ? (
              <Link href="/login?return=/games/defective-system"
                className="inline-flex items-center gap-2 rounded-xl bg-rose-500/20 border border-rose-500/40 px-8 py-3 text-sm font-bold text-rose-300 hover:bg-rose-500/30 transition">
                Sign in to play
              </Link>
            ) : (
              <button
                onClick={startGame}
                disabled={starting}
                className="inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
                style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #be185d 100%)', boxShadow: '0 6px 20px rgba(244,63,94,0.25)' }}
              >
                {starting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                    Initialising…
                  </>
                ) : (
                  <>Accept Assignment — 25 tokens</>
                )}
              </button>
            )}

            <p className="mt-4 text-xs text-zinc-600">
              By clicking Accept, you acknowledge that The System accepts no liability for any outcomes.
            </p>
          </div>
        )}

        {/* ── QUEST / JUDGING ────────────────────────────────────────────────── */}
        {(phase === 'quest' || phase === 'judging') && currentQuest && (
          <div>
            {/* Progress bar */}
            <div className="mb-6 flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-rose-500 transition-all duration-500"
                  style={{ width: `${(currentIndex / 5) * 100}%` }}
                />
              </div>
              <span className="text-xs text-zinc-500 shrink-0">Quest {currentIndex + 1} of 5</span>
            </div>

            {/* Survival record */}
            <div className="mb-4 flex gap-2">
              {Array.from({ length: currentIndex }).map((_, i) => {
                const q = quests[i]
                const s = q?.survived
                return (
                  <div
                    key={i}
                    className={`h-2 w-8 rounded-full ${
                      s === true  ? 'bg-emerald-500' :
                      s === false ? 'bg-rose-500' :
                      'bg-zinc-700'
                    }`}
                  />
                )
              })}
              {Array.from({ length: 5 - currentIndex }).map((_, i) => (
                <div key={`future-${i}`} className={`h-2 w-8 rounded-full ${i === 0 ? 'bg-zinc-600 animate-pulse' : 'bg-zinc-800'}`} />
              ))}
            </div>

            {/* Quest card */}
            <div className="rounded-2xl border border-[rgba(255,255,255,0.12)] p-6 mb-6" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${DIFFICULTY_COLORS[currentQuest.difficulty] ?? 'text-zinc-400 border-zinc-700 bg-zinc-800'}`}>
                  {DIFFICULTY_LABELS[currentQuest.difficulty] ?? currentQuest.difficulty}
                </span>
                <span className="text-xs text-zinc-600 font-mono">
                  {currentQuest.pointValue.toLocaleString()} pts
                </span>
              </div>

              <p className="text-sm leading-relaxed font-mono whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.92)' }}>
                {currentQuest.text}
              </p>
            </div>

            {/* Judgment */}
            {(phase === 'judging' || judgment) && (
              <div ref={judgmentRef} className="rounded-2xl border border-zinc-700 p-5 mb-6" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
                  SYSTEM JUDGMENT
                </p>
                <p className="text-sm leading-relaxed font-mono whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.92)' }}>
                  {judgment}
                  {phase === 'judging' && !judgment && (
                    <span className="animate-pulse">▋</span>
                  )}
                </p>
                {currentSurvived !== null && (
                  <div className={`mt-4 rounded-lg border px-4 py-2 text-center text-sm font-bold ${
                    currentSurvived
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                      : 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                  }`}>
                    {currentSurvived ? '✓ Survived' : '✗ Quest Failed'}
                  </div>
                )}
              </div>
            )}

            {/* Response input (hidden while judging) */}
            {phase === 'quest' && (
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">
                  Your Response / Attempt
                </label>
                <textarea
                  ref={textareaRef}
                  value={response}
                  onChange={e => setResponse(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitResponse() }}
                  placeholder="Describe your attempt at completing this quest…"
                  maxLength={600}
                  rows={4}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/50 transition resize-none"
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-zinc-600">{response.length}/600 · Ctrl+Enter to submit</span>
                  <button
                    onClick={submitResponse}
                    disabled={!response.trim()}
                    className="rounded-xl px-5 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #be185d 100%)' }}
                  >
                    Submit to The System
                  </button>
                </div>
              </div>
            )}

            {/* Next quest button (after judging) */}
            {phase === 'judging' && currentSurvived !== null && currentIndex < 4 && (
              <div className="text-center mt-4">
                <button
                  onClick={nextQuest}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-8 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-700 transition"
                >
                  Next Quest →
                </button>
              </div>
            )}

            {error && (
              <p className="mt-3 text-sm text-rose-400 text-center">{error}</p>
            )}
          </div>
        )}

        {/* ── COMPLETE ───────────────────────────────────────────────────────── */}
        {phase === 'complete' && (
          <div className="text-center">
            <div className="mb-6 text-5xl select-none">
              {survivedCount === 5 ? '🏆' : survivedCount >= 3 ? '🎖️' : survivedCount >= 1 ? '💀' : '☠️'}
            </div>

            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-rose-500/70">
              SESSION TERMINATED
            </p>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'rgba(255,255,255,0.92)' }}>
              {survivedCount === 5 ? 'Somehow, You Survived.' :
               survivedCount >= 3 ? 'A Respectable Failure.' :
               survivedCount >= 1 ? 'The System Is Disappointed.' :
               'Compliance Rating: 0%'}
            </h2>
            <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {survivedCount === 5 ? 'You completed all five quests. The System has noted this anomaly for investigation.' :
               survivedCount >= 3 ? `You survived ${survivedCount} of 5 quests. This is above the 23rd percentile.` :
               survivedCount >= 1 ? `You survived ${survivedCount} of 5 quests. The System expected as much.` :
               'You did not survive a single quest. This is a new record. The System is making a note.'}
            </p>

            {/* Quest results */}
            <div className="mb-8 space-y-3 text-left max-w-lg mx-auto">
              {quests.map((q, i) => (
                <div
                  key={i}
                  className={`rounded-xl border p-4 ${
                    q.survived === true  ? 'border-emerald-500/30 bg-emerald-500/5' :
                    q.survived === false ? 'border-rose-500/30 bg-rose-500/5' :
                    'border-zinc-700 bg-zinc-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-zinc-400">Quest {i + 1}</span>
                    <span className={`text-xs font-bold ${
                      q.survived === true ? 'text-emerald-400' :
                      q.survived === false ? 'text-rose-400' :
                      'text-zinc-600'
                    }`}>
                      {q.survived === true ? '✓ Survived' : q.survived === false ? '✗ Failed' : '— Skipped'}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {q.text.slice(0, 120)}{q.text.length > 120 ? '…' : ''}
                  </p>
                </div>
              ))}
            </div>

            {/* Final score card */}
            <div className="mb-8 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 max-w-sm mx-auto">
              <p className="text-xs font-bold uppercase tracking-widest text-rose-500/70 mb-2">OFFICIAL RECORD</p>
              <p className="text-4xl font-black text-rose-400 mb-1">{survivedCount}/5</p>
              <p className="text-xs text-zinc-500">Quests survived · Session closed</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={playAgain}
                className="rounded-xl px-8 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #be185d 100%)' }}
              >
                Accept New Assignment — 25 tokens
              </button>
              <Link
                href="/games"
                className="rounded-xl border border-zinc-700 px-8 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 transition"
              >
                Back to Games
              </Link>
            </div>
          </div>
        )}

        {/* ── ERROR ──────────────────────────────────────────────────────────── */}
        {phase === 'error' && (
          <div className="text-center">
            <p className="text-rose-400 mb-4">{error}</p>
            <button onClick={playAgain} className="rounded-lg border border-zinc-700 px-6 py-2 text-sm text-zinc-300">
              Try Again
            </button>
          </div>
        )}

      </main>

      <TestFooter />
    </div>
  )
}
