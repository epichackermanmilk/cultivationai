'use client'

import { useState, useEffect, useRef } from 'react'
import Link        from 'next/link'
import TokenWidget from '@/components/TokenWidget'
import Footer      from '@/components/Footer'
import { useAuth } from '@/lib/auth-context'
import { matchesSearch } from '@/lib/search'

// ─────────────────────────────────────────────────────────────────────────────
interface Novel { slug: string; title: string; author?: string }
type Phase = 'select' | 'playing' | 'complete'

interface ReviewItem { q: string; answer: string; userAnswer: string | null; correct: boolean | null; novelTitle: string }

const TOKENS_PER_Q = 2
const COUNTS = [5, 10, 15, 20]

const GRADE_COLOR: Record<string, string> = {
  S: 'text-amber-300', A: 'text-emerald-400', B: 'text-sky-400',
  C: 'text-yellow-400', D: 'text-orange-400', F: 'text-rose-400',
}

// ─────────────────────────────────────────────────────────────────────────────
export default function TriviaPage() {
  const { user, updateTokens } = useAuth()

  // selection
  const [novelQuery, setNovelQuery]   = useState('')
  const [allNovels,  setAllNovels]    = useState<Novel[]>([])
  const [results,    setResults]      = useState<Novel[]>([])
  const [picked,     setPicked]       = useState<Novel[]>([])
  const [showDrop,   setShowDrop]     = useState(false)
  const [count,      setCount]        = useState(10)
  const [maxChapter, setMaxChapter]   = useState('')
  const dropRef = useRef<HTMLDivElement>(null)

  // game
  const [phase,      setPhase]      = useState<Phase>('select')
  const [sessionId,  setSessionId]  = useState<string | null>(null)
  const [question,   setQuestion]   = useState('')
  const [qIndex,     setQIndex]     = useState(0)
  const [total,      setTotal]      = useState(0)
  const [answer,     setAnswer]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState<{ correct: boolean; feedback: string; correctAnswer: string; answerContext?: string } | null>(null)
  const [correctSoFar, setCorrectSoFar] = useState(0)
  const [starting,   setStarting]   = useState(false)
  const [error,      setError]      = useState('')

  // complete
  const [finalScore, setFinalScore] = useState(0)
  const [finalGrade, setFinalGrade] = useState('')
  const [review,     setReview]     = useState<ReviewItem[]>([])

  const answerRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/novels').then(r => r.json()).then((d: Novel[] | { novels?: Novel[] }) => {
      setAllNovels((Array.isArray(d) ? d : (d.novels ?? [])).filter(n => !('coming_soon' in n)))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!novelQuery.trim()) { setResults([]); return }
    const pickedSlugs = new Set(picked.map(p => p.slug))
    setResults(allNovels.filter(n => !pickedSlugs.has(n.slug) &&
      (matchesSearch(n.title, novelQuery) || matchesSearch(n.author ?? '', novelQuery))).slice(0, 8))
  }, [novelQuery, allNovels, picked])

  useEffect(() => {
    function h(e: MouseEvent) { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (phase === 'playing' && !lastResult && answerRef.current) answerRef.current.focus()
  }, [phase, lastResult, qIndex])

  const cost = count * TOKENS_PER_Q

  function addNovel(n: Novel) {
    if (picked.length >= 10) return
    setPicked(p => [...p, n]); setNovelQuery(''); setShowDrop(false)
  }
  function removeNovel(slug: string) { setPicked(p => p.filter(n => n.slug !== slug)) }

  // ── Start ──────────────────────────────────────────────────────────────────
  async function start() {
    if (!user || picked.length === 0) return
    setStarting(true); setError('')
    try {
      const r = await fetch('/api/games/trivia/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          novels: picked.map(p => ({ slug: p.slug, title: p.title })),
          questionCount: count,
          maxChapter: maxChapter ? parseInt(maxChapter, 10) : null,
        }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error ?? 'Failed to start.'); return }
      updateTokens(user.tokens - cost)
      setSessionId(d.sessionId)
      setQuestion(d.question); setQIndex(0); setTotal(d.total)
      setAnswer(''); setLastResult(null); setCorrectSoFar(0)
      setPhase('playing')
    } catch { setError('Network error.') }
    finally { setStarting(false) }
  }

  // ── Submit answer ───────────────────────────────────────────────────────────
  async function submit() {
    if (!sessionId || submitting || lastResult) return
    setSubmitting(true); setError('')
    try {
      const r = await fetch('/api/games/trivia/answer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, answer: answer.trim() }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error ?? 'Failed.'); return }
      setLastResult({ correct: d.correct, feedback: d.feedback, correctAnswer: d.correctAnswer, answerContext: d.answerContext })
      setCorrectSoFar(d.done ? d.score : d.correctSoFar)
      if (d.done) {
        setFinalScore(d.score); setFinalGrade(d.grade); setReview(d.review)
        // brief pause so they see the last verdict
      } else {
        // store next question to show after they continue
        ;(window as unknown as { __nextQ?: string; __nextI?: number }).__nextQ = d.nextQuestion
        ;(window as unknown as { __nextI?: number }).__nextI = d.questionIndex
      }
    } catch { setError('Network error.') }
    finally { setSubmitting(false) }
  }

  function next() {
    const w = window as unknown as { __nextQ?: string; __nextI?: number }
    if (w.__nextQ !== undefined) {
      setQuestion(w.__nextQ); setQIndex(w.__nextI ?? qIndex + 1)
      setAnswer(''); setLastResult(null)
    } else {
      // was the last question
      setPhase('complete')
    }
  }

  function finishToComplete() { setPhase('complete') }

  function reset() {
    setPhase('select'); setSessionId(null); setPicked([]); setNovelQuery('')
    setAnswer(''); setLastResult(null); setError(''); setReview([])
  }

  const isLastQuestion = qIndex + 1 >= total

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>
      <header className="sticky top-0 z-50 border-b border-[var(--nc-border)] bg-[var(--nc-bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/games" className="text-zinc-400 hover:text-zinc-200 transition text-sm">← Games</Link>
            <div className="h-4 w-px bg-zinc-700" />
            <div className="flex items-center gap-2"><span className="text-base">🧠</span>
              <span className="font-bold text-sky-400 text-sm">Trivia Gauntlet</span></div>
          </div>
          <div className="flex items-center gap-3">
            {phase === 'playing' && <span className="text-xs text-zinc-500">Q {qIndex + 1}/{total} · {correctSoFar} correct</span>}
            <TokenWidget />
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-8">

        {/* ── SELECT ─────────────────────────────────────────────────────────── */}
        {phase === 'select' && (
          <div>
            <div className="mb-8 text-center">
              <div className="mb-4 text-5xl">🧠</div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-sky-500/70">Test Your Knowledge</p>
              <h1 className="text-3xl font-bold tracking-tight mb-3">Trivia Gauntlet</h1>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
                Pick up to 10 novels. We&apos;ll ask random questions pulled from across them —
                we won&apos;t tell you which novel each one is from. Close answers count (typos forgiven);
                wild guesses don&apos;t. How well do you really know your stories?
              </p>
            </div>

            <div className="space-y-5">
              {/* Novel picker */}
              <div ref={dropRef} className="relative">
                <label className="block text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">
                  Novels ({picked.length}/10)
                </label>
                <input type="text" placeholder="Search to add a novel…" value={novelQuery}
                  onChange={e => { setNovelQuery(e.target.value); setShowDrop(true) }}
                  onFocus={() => setShowDrop(true)}
                  disabled={picked.length >= 10}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-sky-500/50 transition disabled:opacity-50" />
                {showDrop && results.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl overflow-hidden">
                    {results.map(n => (
                      <button key={n.slug} onMouseDown={() => addNovel(n)}
                        className="w-full text-left px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 transition flex justify-between gap-2">
                        <span className="truncate">{n.title}</span>
                        {n.author && <span className="text-xs text-zinc-600 shrink-0">{n.author}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {picked.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {picked.map(n => (
                      <span key={n.slug} className="flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs text-sky-300">
                        {n.title.length > 30 ? n.title.slice(0, 28) + '…' : n.title}
                        <button onClick={() => removeNovel(n.slug)} className="text-sky-500 hover:text-sky-300">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Question count */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">Questions</label>
                <div className="grid grid-cols-4 gap-2">
                  {COUNTS.map(c => (
                    <button key={c} onClick={() => setCount(c)}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                        count === c ? 'border-sky-500/60 bg-sky-500/10 text-sky-400' : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                      }`}>
                      {c}
                      <span className="block text-[10px] font-normal text-zinc-600">{c * TOKENS_PER_Q} tok</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chapter limit */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">
                  Only ask about chapters before <span className="font-normal text-zinc-600">(optional — avoids spoilers)</span>
                </label>
                <input type="number" min={1} placeholder="e.g. 400 — leave blank for whole story"
                  value={maxChapter} onChange={e => setMaxChapter(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-sky-500/50 transition" />
              </div>

              {error && <p className="text-sm text-rose-400 text-center">{error}</p>}

              {!user ? (
                <Link href="/library" className="block text-center rounded-xl border border-sky-500/40 bg-sky-500/10 px-8 py-3 text-sm font-bold text-sky-300 hover:bg-sky-500/20 transition">Sign in to play</Link>
              ) : (
                <button onClick={start} disabled={picked.length === 0 || starting}
                  className="w-full rounded-xl px-8 py-3.5 text-sm font-bold text-black transition hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', boxShadow: picked.length ? '0 6px 20px rgba(14,165,233,0.25)' : 'none' }}>
                  {starting ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent inline-block mr-2" />Writing your quiz…</> : `🧠 Start Quiz — ${cost} tokens`}
                </button>
              )}
              <p className="text-center text-xs text-zinc-600">{TOKENS_PER_Q} tokens per question · letter grade at the end</p>
            </div>
          </div>
        )}

        {/* ── PLAYING ────────────────────────────────────────────────────────── */}
        {phase === 'playing' && (
          <div>
            {/* progress */}
            <div className="mb-6 flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full rounded-full bg-sky-500 transition-all duration-500" style={{ width: `${(qIndex / total) * 100}%` }} />
              </div>
              <span className="text-xs text-zinc-500 shrink-0">{qIndex + 1}/{total}</span>
            </div>

            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-6 mb-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-sky-500/70 mb-2">Question {qIndex + 1}</p>
              <p className="text-lg leading-relaxed" style={{ color: 'var(--nc-text)' }}>{question}</p>
            </div>

            {!lastResult ? (
              <div>
                <input ref={answerRef} type="text" value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submit() }}
                  placeholder="Type your answer…"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-sky-500/60 transition" />
                <div className="mt-3 flex items-center justify-between">
                  <button onClick={() => { setAnswer(''); submit() }} disabled={submitting}
                    className="text-xs text-zinc-600 hover:text-zinc-400 transition">Skip / I don&apos;t know</button>
                  <button onClick={submit} disabled={submitting || !answer.trim()}
                    className="rounded-xl px-6 py-2.5 text-sm font-bold text-black transition hover:opacity-90 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' }}>
                    {submitting ? 'Checking…' : 'Submit'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* verdict */}
                <div className={`rounded-2xl border p-5 ${lastResult.correct ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-rose-500/40 bg-rose-500/10'}`}>
                  <p className={`text-sm font-bold mb-1 ${lastResult.correct ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {lastResult.correct ? '✓ Correct' : '✗ Not quite'}
                  </p>
                  {lastResult.feedback && <p className="text-sm" style={{ color: 'var(--nc-text2)' }}>{lastResult.feedback}</p>}
                  {!lastResult.correct && (
                    <p className="text-xs mt-1 text-zinc-500">Answer: <span className="text-zinc-300">{lastResult.correctAnswer}</span></p>
                  )}
                  {lastResult.answerContext && (
                    <p className="mt-2.5 border-t border-white/10 pt-2.5 text-xs leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
                      <span className="text-amber-400/80">💡 </span>{lastResult.answerContext}
                    </p>
                  )}
                </div>
                <button onClick={isLastQuestion ? finishToComplete : next}
                  className="mt-4 w-full rounded-xl px-6 py-3 text-sm font-bold text-black transition hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' }}>
                  {isLastQuestion ? 'See My Grade →' : 'Next Question →'}
                </button>
              </div>
            )}
            {error && <p className="mt-3 text-sm text-rose-400 text-center">{error}</p>}
          </div>
        )}

        {/* ── COMPLETE ───────────────────────────────────────────────────────── */}
        {phase === 'complete' && (
          <div className="text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-sky-500/70">Quiz Complete</p>
            <div className={`my-4 text-7xl font-black ${GRADE_COLOR[finalGrade] ?? 'text-zinc-300'}`}>{finalGrade}</div>
            <p className="text-lg font-bold mb-1">{finalScore} / {review.length} correct</p>
            <p className="text-sm mb-8" style={{ color: 'var(--nc-text2)' }}>
              {finalGrade === 'S' ? 'Flawless. You truly know these stories.' :
               finalGrade === 'A' ? 'Excellent — a true connoisseur.' :
               finalGrade === 'B' ? 'Solid. You know your stuff.' :
               finalGrade === 'C' ? 'Not bad — a few gaps to fill.' :
               finalGrade === 'D' ? 'Time for a re-read, perhaps.' :
               'The heavens weep. Back to chapter one!'}
            </p>

            {/* review */}
            <div className="mb-8 space-y-2 text-left">
              {review.map((q, i) => (
                <div key={i} className={`rounded-xl border p-3 ${q.correct ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-rose-500/25 bg-rose-500/5'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
                      <span className={q.correct ? 'text-emerald-400' : 'text-rose-400'}>{q.correct ? '✓' : '✗'}</span> {q.q}
                    </p>
                  </div>
                  <p className="mt-1.5 text-[11px] text-zinc-600">
                    Answer: <span className="text-zinc-400">{q.answer}</span>
                    {q.userAnswer ? <> · You: <span className={q.correct ? 'text-emerald-400/80' : 'text-rose-400/80'}>{q.userAnswer}</span></> : ' · (skipped)'}
                    {q.novelTitle && <> · <span className="text-zinc-600 italic">{q.novelTitle}</span></>}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={reset}
                className="rounded-xl px-8 py-3 text-sm font-bold text-black transition hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' }}>
                New Quiz
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
