'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import TokenWidget from '@/components/TokenWidget'
import { useAuth } from '@/lib/auth-context'
import { SECT_PRESETS } from '@/lib/games/archetypes'
import type { Treatment } from '@/lib/games/archetypes'

// ── Types ──────────────────────────────────────────────────────────────────────
interface Applicant {
  name: string; age: number; hometown: string
  appearance: string; background: string; cultivation: string; openingStatement: string
}

interface RevealEntry {
  displayName: string; archetypeName: string; treatment: Treatment
  narrative: string; potential: number; tells: string[]
  sectEffects: { metric: string; delta: number; description: string }[]
}

interface SectOutcome {
  power: number; wealth: number; reputation: number; safety: number
  title: string; summary: string
}

type Phase = 'lobby' | 'interview' | 'reveal' | 'complete' | 'error'

const TREATMENT_LABELS: Record<Treatment, { label: string; color: string; icon: string }> = {
  well:     { label: 'Treat Well',    color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20', icon: '✦' },
  ignored:  { label: 'Ignore',        color: 'border-zinc-500/50 bg-zinc-700/30 text-zinc-300 hover:bg-zinc-700/50',             icon: '—' },
  poorly:   { label: 'Treat Poorly',  color: 'border-orange-500/50 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20',    icon: '↓' },
  expelled: { label: 'Expel',         color: 'border-rose-500/50 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20',            icon: '✕' },
}

const METRIC_LABELS: Record<string, string> = {
  power: 'Power', wealth: 'Wealth', reputation: 'Reputation', safety: 'Safety',
}

// ── Stat bar ───────────────────────────────────────────────────────────────────
function StatBar({ label, value }: { label: string; value: number }) {
  const color = value >= 60 ? 'bg-emerald-500' : value >= 35 ? 'bg-amber-500' : 'bg-rose-500'
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: 'var(--nc-text2)' }}>{label}</span>
        <span className="font-semibold" style={{ color: 'var(--nc-text)' }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--nc-bg3)' }}>
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function SectRecruitmentPage() {
  const { user } = useAuth()

  // Game state
  const [phase,          setPhase]          = useState<Phase>('lobby')
  const [sessionId,      setSessionId]      = useState<string | null>(null)
  const [presetId,       setPresetId]       = useState('declining')
  const [preset,         setPreset]         = useState(SECT_PRESETS[0])
  const [currentIndex,   setCurrentIndex]   = useState(0)
  const [totalApplicants,setTotal]          = useState(8)
  const [applicant,      setApplicant]      = useState<Applicant | null>(null)
  const [messages,       setMessages]       = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [questionsLeft,  setQuestionsLeft]  = useState(2)
  const [input,          setInput]          = useState('')
  const [streaming,      setStreaming]      = useState(false)
  const [loading,        setLoading]        = useState(false)
  const [errorMsg,       setErrorMsg]       = useState('')
  const [reveals,        setReveals]        = useState<RevealEntry[]>([])
  const [sectOutcome,    setSectOutcome]    = useState<SectOutcome | null>(null)
  const [revealIndex,    setRevealIndex]    = useState(-1)  // which card is currently revealed
  const [decisions,      setDecisions]      = useState<{ name: string; decision: Treatment }[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  // Reset messages when applicant changes
  useEffect(() => {
    if (applicant) {
      setMessages([{ role: 'assistant', content: applicant.openingStatement }])
      setQuestionsLeft(2)
      setInput('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [applicant])

  // ── Start game ───────────────────────────────────────────────────────────────
  async function startGame() {
    if (!user) { setErrorMsg('Sign in to play'); return }
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/games/sect-recruitment/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Failed to start')
        return
      }
      setSessionId(data.sessionId)
      setTotal(data.totalApplicants)
      setCurrentIndex(0)
      setApplicant(data.applicant)
      setPreset(SECT_PRESETS.find(p => p.id === presetId) ?? SECT_PRESETS[0])
      setDecisions([])
      setPhase('interview')
    } catch {
      setErrorMsg('Connection error — please try again')
    } finally {
      setLoading(false)
    }
  }

  // ── Send message ─────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming || questionsLeft <= 0 || !sessionId) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setStreaming(true)

    try {
      const res = await fetch('/api/games/sect-recruitment/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text }),
      })
      if (!res.ok) {
        const d = await res.json()
        if (d.code === 'LIMIT_REACHED') { setQuestionsLeft(0) }
        else { setMessages(prev => [...prev, { role: 'assistant', content: '...' }]) }
        return
      }
      const remaining = parseInt(res.headers.get('X-Questions-Left') ?? '0', 10)
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let full = ''
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setMessages(prev => {
          const next = [...prev]
          next[next.length - 1] = { role: 'assistant', content: full }
          return next
        })
      }
      setQuestionsLeft(remaining)
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'A disturbance in the spiritual energy prevents response.' }])
    } finally {
      setStreaming(false)
    }
  }, [input, streaming, questionsLeft, sessionId])

  // ── Make decision ─────────────────────────────────────────────────────────────
  async function makeDecision(treatment: Treatment) {
    if (!sessionId || !applicant) return
    setLoading(true)
    try {
      const res = await fetch('/api/games/sect-recruitment/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, decision: treatment }),
      })
      const data = await res.json()
      if (!res.ok) { setErrorMsg(data.error); return }

      setDecisions(prev => [...prev, { name: applicant.name, decision: treatment }])

      if (data.done) {
        // All applicants seen — generate reveal
        await generateReveal()
      } else {
        setCurrentIndex(data.currentIndex)
        setApplicant(data.applicant)
      }
    } catch {
      setErrorMsg('Connection error')
    } finally {
      setLoading(false)
    }
  }

  // ── Generate reveal ───────────────────────────────────────────────────────────
  async function generateReveal() {
    if (!sessionId) return
    setLoading(true)
    setPhase('reveal')
    try {
      const res = await fetch('/api/games/sect-recruitment/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json()
      if (!res.ok) { setErrorMsg(data.error ?? 'Reveal failed'); return }
      setReveals(data.reveals)
      setSectOutcome(data.sectOutcome)
      setRevealIndex(-1)
      setLoading(false)
      // Start reveal sequence
      revealNext(data.reveals.length, 0)
    } catch {
      setErrorMsg('Connection error during reveal')
      setLoading(false)
    }
  }

  function revealNext(total: number, idx: number) {
    if (idx >= total) { setPhase('complete'); return }
    setRevealIndex(idx)
    setTimeout(() => revealNext(total, idx + 1), 2200)
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────────
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen flex flex-col pb-16 sm:pb-0" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--nc-border)] bg-[var(--nc-bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/games" className="text-zinc-400 hover:text-zinc-100 transition text-sm">
              ← Games
            </Link>
            <div className="h-4 w-px bg-zinc-700" />
            <span className="text-sm font-semibold text-amber-400">📜 Sect Recruitment</span>
          </div>
          <TokenWidget />
        </div>
      </header>

      {/* ── LOBBY ────────────────────────────────────────────────────────────── */}
      {phase === 'lobby' && (
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="w-full max-w-xl">
            <div className="text-center mb-8">
              <p className="text-4xl mb-3">📜</p>
              <h1 className="text-3xl font-bold text-amber-400 mb-2">Sect Recruitment</h1>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
                Eight applicants will arrive. Each one hides a secret you cannot see.
                Your decisions shape the sect&apos;s next thousand years.
              </p>
            </div>

            {/* Preset picker */}
            <div className="mb-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Choose your sect</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {SECT_PRESETS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPresetId(p.id)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      presetId === p.id
                        ? 'border-amber-500/60 bg-amber-500/10'
                        : 'border-[var(--nc-border)] hover:border-amber-500/30'
                    }`}
                    style={{ background: presetId === p.id ? undefined : 'var(--nc-bg2)' }}
                  >
                    <p className={`text-sm font-bold mb-0.5 ${presetId === p.id ? 'text-amber-400' : ''}`}
                      style={presetId !== p.id ? { color: 'var(--nc-text)' } : {}}>
                      {p.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--nc-text2)' }}>{p.tagline}</p>
                    <p className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--nc-text2)' }}>{p.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Cost + CTA */}
            <div className="rounded-xl border border-[var(--nc-border)] p-4 mb-4"
              style={{ background: 'var(--nc-bg2)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--nc-text)' }}>One session — 25 tokens</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--nc-text2)' }}>
                    8 applicants · 2 questions each · ~15 minutes · No per-turn charges
                  </p>
                </div>
                <span className="text-2xl">⚔️</span>
              </div>
            </div>

            {errorMsg && (
              <p className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-400">
                {errorMsg}
              </p>
            )}

            {!user ? (
              <div className="text-center">
                <p className="mb-3 text-sm" style={{ color: 'var(--nc-text2)' }}>Sign in to begin recruitment</p>
                <Link href="/auth"
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-black hover:bg-amber-400 transition">
                  Sign In →
                </Link>
              </div>
            ) : (
              <button
                onClick={startGame}
                disabled={loading}
                className="w-full rounded-xl bg-amber-500 py-3.5 text-sm font-bold text-black hover:bg-amber-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Preparing the hall…' : 'Begin Recruitment — 25 tokens'}
              </button>
            )}
          </div>
        </main>
      )}

      {/* ── INTERVIEW ─────────────────────────────────────────────────────────── */}
      {phase === 'interview' && applicant && (
        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden max-h-[calc(100dvh-57px)]">

          {/* Left panel — applicant profile */}
          <aside className="shrink-0 lg:w-72 overflow-y-auto border-b lg:border-b-0 lg:border-r border-[var(--nc-border)] p-4"
            style={{ background: 'var(--nc-bg2)' }}>

            {/* Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-amber-400">
                  Applicant {currentIndex + 1} of {totalApplicants}
                </span>
                <span className="text-xs" style={{ color: 'var(--nc-text2)' }}>
                  {questionsLeft} question{questionsLeft !== 1 ? 's' : ''} left
                </span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: totalApplicants }).map((_, i) => (
                  <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${
                    i < currentIndex ? 'bg-amber-500' : i === currentIndex ? 'bg-amber-500/60' : 'bg-zinc-700'
                  }`} />
                ))}
              </div>
            </div>

            {/* Profile card */}
            <div className="rounded-xl border border-[var(--nc-border)] overflow-hidden mb-4"
              style={{ background: 'var(--nc-bg3)' }}>
              <div className="px-4 py-3 border-b border-[var(--nc-border)]"
                style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, transparent 100%)' }}>
                <p className="font-bold text-amber-400">{applicant.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--nc-text2)' }}>
                  Age {applicant.age} · {applicant.hometown}
                </p>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Appearance</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--nc-text2)' }}>{applicant.appearance}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Background</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--nc-text2)' }}>{applicant.background}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Cultivation</p>
                  <p className="text-xs font-medium text-amber-400/80">{applicant.cultivation}</p>
                </div>
              </div>
            </div>

            {/* Previous decisions */}
            {decisions.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Decisions Made</p>
                <div className="space-y-1.5">
                  {decisions.map((d, i) => {
                    const t = TREATMENT_LABELS[d.decision]
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span style={{ color: 'var(--nc-text2)' }} className="truncate flex-1">{d.name}</span>
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${t.color}`}>{t.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </aside>

          {/* Right panel — interview chat */}
          <div className="flex flex-1 flex-col min-h-0">

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="mb-2 text-center">
                <span className="text-xs px-3 py-1 rounded-full border border-[var(--nc-border)]"
                  style={{ color: 'var(--nc-text2)', background: 'var(--nc-bg2)' }}>
                  {preset.name} · Elder Interview
                </span>
              </div>
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed border ${
                    msg.role === 'user'
                      ? 'rounded-br-sm border-violet-500/30'
                      : 'rounded-bl-sm border-amber-500/20'
                  }`}
                    style={msg.role === 'user'
                      ? { background: 'linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(99,102,241,0.10) 100%)', color: 'var(--nc-text)' }
                      : { background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(180,83,9,0.06) 100%)', color: 'var(--nc-text)' }
                    }>
                    {msg.role === 'assistant' && (
                      <p className="text-[10px] font-semibold text-amber-500/70 mb-1">{applicant.name}</p>
                    )}
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Decision buttons */}
            <div className="shrink-0 border-t border-[var(--nc-border)] p-3 space-y-3"
              style={{ background: 'var(--nc-bg)' }}>
              {/* Decision row */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.keys(TREATMENT_LABELS) as Treatment[]).map(t => {
                  const tl = TREATMENT_LABELS[t]
                  return (
                    <button
                      key={t}
                      onClick={() => makeDecision(t)}
                      disabled={loading || streaming}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${tl.color}`}
                    >
                      {tl.icon} {tl.label}
                    </button>
                  )
                })}
              </div>

              {/* Chat input */}
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  disabled={questionsLeft <= 0 || streaming}
                  placeholder={
                    questionsLeft <= 0
                      ? 'Question limit reached — make your decision above'
                      : `Ask ${applicant.name} a question… (${questionsLeft} left)`
                  }
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-[var(--nc-border)] px-3 py-2.5 text-sm placeholder-zinc-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition max-h-24 overflow-y-auto disabled:opacity-50"
                  style={{ background: 'var(--nc-bg2)', color: 'var(--nc-text)', fieldSizing: 'content' } as React.CSSProperties}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || questionsLeft <= 0 || streaming}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-black transition hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              </div>
              <p className="text-center text-xs text-zinc-600">
                Ask questions · then use the buttons above to render your judgement
              </p>
            </div>
          </div>
        </main>
      )}

      {/* ── REVEAL LOADING ────────────────────────────────────────────────────── */}
      {phase === 'reveal' && loading && (
        <main className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
          <div className="text-4xl animate-pulse">⚖️</div>
          <p className="text-lg font-semibold text-amber-400">The records are being consulted…</p>
          <p className="text-sm" style={{ color: 'var(--nc-text2)' }}>
            Every decision is being weighed across ten thousand years of history.
          </p>
        </main>
      )}

      {/* ── REVEAL SEQUENCE ───────────────────────────────────────────────────── */}
      {phase === 'reveal' && !loading && reveals.length > 0 && (
        <main className="flex-1 overflow-y-auto px-4 py-8 max-w-2xl mx-auto w-full">
          <div className="text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-500/70 mb-2">✦ The Truth Revealed</p>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--nc-text)' }}>Who Were They, Really?</h2>
          </div>

          <div className="space-y-4">
            {reveals.map((r, i) => {
              const isRevealed = i <= revealIndex
              const t = TREATMENT_LABELS[r.treatment]
              return (
                <div key={i}
                  className={`rounded-2xl border transition-all duration-700 overflow-hidden ${
                    isRevealed
                      ? 'border-amber-500/30 opacity-100 translate-y-0'
                      : 'border-[var(--nc-border)] opacity-20 translate-y-2'
                  }`}
                  style={{ background: 'var(--nc-bg2)' }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--nc-border)]"
                    style={{ background: isRevealed ? 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, transparent 100%)' : undefined }}>
                    <div>
                      <p className="font-bold text-amber-400">{r.displayName}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--nc-text2)' }}>
                        was the <span className="font-semibold" style={{ color: 'var(--nc-text)' }}>{r.archetypeName}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-semibold border ${t.color}`}>{t.label}</span>
                      <span className="text-xs text-zinc-500">Potential {r.potential}/100</span>
                    </div>
                  </div>

                  {isRevealed && (
                    <div className="px-5 py-4 space-y-3">
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--nc-text)' }}>{r.narrative}</p>

                      {/* Tells */}
                      {r.tells.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">The tells you may have missed</p>
                          <ul className="space-y-1">
                            {r.tells.map((tell, ti) => (
                              <li key={ti} className="text-xs flex items-start gap-2" style={{ color: 'var(--nc-text2)' }}>
                                <span className="text-amber-500/60 mt-0.5 shrink-0">›</span>
                                {tell}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Effects */}
                      {r.sectEffects.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {r.sectEffects.map((e, ei) => (
                            <span key={ei} className={`text-[10px] rounded-full border px-2 py-0.5 font-medium ${
                              e.delta > 0
                                ? 'border-emerald-500/30 text-emerald-400'
                                : e.delta < 0
                                  ? 'border-rose-500/30 text-rose-400'
                                  : 'border-zinc-600 text-zinc-400'
                            }`}>
                              {METRIC_LABELS[e.metric]} {e.delta > 0 ? '+' : ''}{e.delta} · {e.description}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </main>
      )}

      {/* ── COMPLETE ──────────────────────────────────────────────────────────── */}
      {phase === 'complete' && sectOutcome && (
        <main className="flex-1 overflow-y-auto px-4 py-8 max-w-2xl mx-auto w-full">
          <div className="text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-500/70 mb-2">✦ Judgement Complete</p>
            <h2 className="text-3xl font-bold text-amber-400 mb-1">{sectOutcome.title}</h2>
            <p className="text-sm" style={{ color: 'var(--nc-text2)' }}>{sectOutcome.summary}</p>
          </div>

          {/* Stat bars */}
          <div className="rounded-2xl border border-[var(--nc-border)] p-6 mb-6 space-y-4"
            style={{ background: 'var(--nc-bg2)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Sect State — 1,000 Years Hence</p>
            <StatBar label="Power"      value={sectOutcome.power}      />
            <StatBar label="Wealth"     value={sectOutcome.wealth}     />
            <StatBar label="Reputation" value={sectOutcome.reputation} />
            <StatBar label="Safety"     value={sectOutcome.safety}     />
          </div>

          {/* Summary of decisions */}
          <div className="rounded-2xl border border-[var(--nc-border)] p-5 mb-8"
            style={{ background: 'var(--nc-bg2)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Your Choices</p>
            <div className="space-y-2">
              {reveals.map((r, i) => {
                const t = TREATMENT_LABELS[r.treatment]
                return (
                  <div key={i} className="flex items-center justify-between gap-3 text-sm">
                    <span style={{ color: 'var(--nc-text2)' }} className="truncate">
                      {r.displayName} <span className="text-xs text-zinc-500">({r.archetypeName})</span>
                    </span>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold border ${t.color}`}>{t.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                setPhase('lobby')
                setSessionId(null)
                setApplicant(null)
                setMessages([])
                setDecisions([])
                setReveals([])
                setSectOutcome(null)
              }}
              className="flex-1 rounded-xl bg-amber-500 py-3 text-sm font-bold text-black hover:bg-amber-400 transition"
            >
              Play Again
            </button>
            <Link href="/games"
              className="flex-1 rounded-xl border border-[var(--nc-border)] py-3 text-sm font-semibold text-center transition hover:border-amber-500/40"
              style={{ color: 'var(--nc-text2)' }}>
              Back to Games
            </Link>
          </div>
        </main>
      )}

    </div>
  )
}
