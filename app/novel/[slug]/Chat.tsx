'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { track } from '@/lib/analytics'

interface Message {
  role:    'user' | 'assistant'
  content: string
  isError?: boolean
}

interface Props {
  slug:   string
  title:  string
  author: string
}

type EmbedState = 'unknown' | 'checking' | 'not_embedded' | 'embedding' | 'ready' | 'error'
type ChatMode   = 'book' | 'character'

interface CharProfile {
  name:              string
  speech_style?:     string
  core_traits?:      string[]
  motivation?:       string
  key_relationships?: { name: string; relation: string }[]
  era_note?:         string
  featured?:         boolean
}

export default function Chat({ slug, title, author }: Props) {
  const { updateTokens } = useAuth()

  const [messages, setMessages]         = useState<Message[]>([])
  const [input, setInput]               = useState('')
  const [streaming, setStreaming]       = useState(false)
  const [embedState, setEmbedState]     = useState<EmbedState>('unknown')
  const [embedPct, setEmbedPct]         = useState(0)
  const [embedEta, setEmbedEta]         = useState<string | null>(null)
  const [historyLoaded, setHistLoaded]  = useState(false)
  // ── Character mode ─────────────────────────────────────────────────────────
  const [chatMode, setChatMode]         = useState<ChatMode>('book')
  const [characterName, setCharName]    = useState('')
  const [characterProfile, setCharProf] = useState<CharProfile | null>(null)
  const [featuredChars, setFeatured]    = useState<CharProfile[]>([])
  const [charLoading, setCharLoading]   = useState(false)
  // ── Character memory: rolling summary of older messages ────────────────────
  // Avoids the "amnesiac at message 9" problem in long roleplay sessions.
  // We summarise all but the last 8 messages every 16 messages, keeping context
  // compact while preserving what the character "remembers" from earlier.
  const [convSummary,    setConvSummary]    = useState('')
  const [summarizedUpTo, setSummarizedUpTo] = useState(0)  // message index last summarised
  // ── W6: spoiler ceiling ─────────────────────────────────────────────────────
  const [maxChapter, setMaxChapter]            = useState<number | null>(null)
  const [spoilerOpen, setSpoilerOpen]          = useState(false)
  // ── Mode explanation popup (shown once when switching to character mode) ────
  const [showModeExplain, setShowModeExplain] = useState(false)
  const bottomRef                       = useRef<HTMLDivElement>(null)
  const inputRef                        = useRef<HTMLTextAreaElement>(null)
  const pollRef                         = useRef<ReturnType<typeof setInterval> | null>(null)
  const embedStartRef                   = useRef<number | null>(null)
  const pendingTextRef                  = useRef<string | null>(null)

  // Read ?char=NAME&mode=character from URL (set by /characters page links)
  // Using window.location instead of useSearchParams to avoid Suspense requirement
  const urlCharRef = useRef('')
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const char   = params.get('char') ?? ''
    const mode   = params.get('mode')
    if (char)           urlCharRef.current = char
    if (char)           setCharName(char)
    if (mode === 'character') setChatMode('character')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Check embedding status on mount (also resets history state on slug change)
  useEffect(() => {
    setMessages([])
    setHistLoaded(false)
    setEmbedPct(0)
    setEmbedEta(null)
    checkEmbed()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  // Load saved conversation when novel is ready and we haven't loaded yet
  useEffect(() => {
    if (embedState !== 'ready' || historyLoaded) return
    setHistLoaded(true)
    fetch(`/api/conversations/${slug}`)
      .then(r => r.ok ? r.json() : { messages: [] })
      .then(data => {
        const saved = Array.isArray(data.messages) ? data.messages : []
        if (saved.length > 0) {
          setMessages(saved.map((m: { role: string; content: string }) => ({
            role:    m.role as 'user' | 'assistant',
            content: m.content,
          })))
        }
      })
      .catch(() => { /* non-fatal */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedState, slug])

  // Load curated character data once the novel is ready
  useEffect(() => {
    if (embedState !== 'ready' || featuredChars.length > 0) return
    setCharLoading(true)
    fetch(`/api/character/${slug}`)
      .then(r => r.ok ? r.json() : {} as Record<string, unknown>)
      .then((data: Record<string, unknown>) => {
        const featured: CharProfile[] = Array.isArray(data.featured) ? data.featured as CharProfile[] : []
        if (featured.length) setFeatured(featured)

        // Auto-attach the rich profile if coming from /characters page (?char=NAME)
        const urlChar = urlCharRef.current
        if (urlChar) {
          const match = featured.find(p => p.name.toLowerCase() === urlChar.toLowerCase())
          if (match) {
            setCharProf(match)
            setCharName(match.name)
          }
        }
      })
      .catch(() => {})
      .finally(() => setCharLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedState, slug])

  // Pick a character (from featured, community, or free text)
  function selectCharacter(profile: CharProfile) {
    setCharName(profile.name)
    setCharProf(profile)
    setMessages([])
    setConvSummary('')
    setSummarizedUpTo(0)
  }

  function clearCharacter() {
    setCharName('')
    setCharProf(null)
    setMessages([])
    setConvSummary('')
    setSummarizedUpTo(0)
  }

  // Clear messages and character state when switching modes
  function switchMode(m: ChatMode) {
    if (m === chatMode) return
    setChatMode(m)
    setMessages([])
    setConvSummary('')
    setSummarizedUpTo(0)
    setCharName('')
    setCharProf(null)
    setInput('')
    // Show the mode-explanation popup the first time a user switches to character mode
    if (m === 'character' && !localStorage.getItem('nc-char-mode-seen')) {
      setShowModeExplain(true)
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function checkEmbed() {
    setEmbedState('checking')
    try {
      const res  = await fetch(`/api/embed/${slug}`)
      const data = await res.json()
      if (data.embedded) {
        setEmbedState('ready')
      } else if (data.status === 'processing') {
        setEmbedState('embedding')
        setEmbedPct(data.pct ?? 0)
        if (!embedStartRef.current) embedStartRef.current = Date.now()
        startPolling()
      } else {
        setEmbedState('not_embedded')
      }
    } catch {
      setEmbedState('error')
    }
  }

  async function startEmbed() {
    setEmbedPct(0)
    setEmbedEta(null)
    embedStartRef.current = Date.now()
    try {
      const res = await fetch(`/api/embed/${slug}`, { method: 'POST' })
      if (res.status === 401) {
        // Sign-in required to index (prevents anonymous embed abuse)
        setEmbedState('not_embedded')
        pendingTextRef.current = null
        setMessages(prev => [...prev, { role: 'assistant', content: 'Please sign in to chat with this novel — it&apos;s free.', isError: true }])
        return
      }
      // If already embedded (200 with embedded:true), jump straight to ready
      if (res.ok) {
        const data = await res.json()
        if (data.embedded || data.status === 'done') {
          setEmbedState('ready')
          return
        }
      }
    } catch { /* handled by poll */ }
    setEmbedState('embedding')
    startPolling()
  }

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/embed/${slug}`)
        const data = await res.json()
        if (data.embedded || data.status === 'done') {
          clearInterval(pollRef.current!)
          pollRef.current = null
          embedStartRef.current = null
          setEmbedState('ready')
          setEmbedPct(100)
          setEmbedEta(null)
        } else if (data.status === 'processing') {
          const pct = data.pct ?? 0
          setEmbedPct(pct)
          // Estimate remaining time from elapsed + progress
          if (embedStartRef.current && pct > 2) {
            const elapsed   = (Date.now() - embedStartRef.current) / 1000
            const totalEst  = elapsed / (pct / 100)
            const remaining = Math.max(0, Math.round(totalEst - elapsed))
            setEmbedEta(remaining > 60
              ? `~${Math.ceil(remaining / 60)} min remaining`
              : `~${remaining}s remaining`)
          }
        } else if (data.status === 'error') {
          clearInterval(pollRef.current!)
          pollRef.current = null
          setEmbedState('error')
        }
      } catch { /* keep polling */ }
    }, 2500)
  }

  // Core send — assumes the novel is already indexed.
  async function sendText(text: string) {
    if (!text || streaming) return

    const userMsg: Message      = { role: 'user',      content: text }
    const assistantMsg: Message = { role: 'assistant', content: '' }
    // Snapshot current messages for history (before we add the new pair)
    const prevMessages = messages
    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setStreaming(true)
    track('chat_message', { mode: chatMode, slug })

    let fullResponse = ''
    let exchangeOk   = false

    try {
      const history = prevMessages.slice(-8).map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          slug, title, author, message: text, history,
          ...(maxChapter ? { maxChapter } : {}),
          ...(chatMode === 'character' && characterName.trim() ? {
            characterName:    characterName.trim(),
            characterProfile: characterProfile ?? undefined,
            ...(convSummary ? { convSummary } : {}),
          } : {}),
        }),
      })

      // ── Handle error status codes before streaming ────────────────────────
      if (!res.ok) {
        let errMsg = 'Sorry, something went wrong. Please try again.'
        if (res.status === 401) {
          errMsg = 'Please sign in to continue chatting.'
        } else if (res.status === 402) {
          errMsg = '⚡ You\'re out of tokens. Visit the shop to get more and keep chatting!'
        } else {
          try {
            const body = await res.json()
            if (body?.error) errMsg = body.error
          } catch { /* ignore */ }
        }
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: errMsg, isError: true }
          return updated
        })
        return
      }

      // ── Read token balance from header (available immediately) ────────────
      const remaining = res.headers.get('X-Tokens-Remaining')
      if (remaining !== null) {
        const n = parseInt(remaining, 10)
        if (!isNaN(n)) updateTokens(n)
      }

      if (!res.body) throw new Error('No response body')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        fullResponse += chunk
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content + chunk,
          }
          return updated
        })
      }

      exchangeOk = fullResponse.length > 0
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: 'Sorry, something went wrong. Please try again.',
          isError: true,
        }
        return updated
      })
    } finally {
      setStreaming(false)
      setTimeout(() => inputRef.current?.focus(), 50)

      // ── Persist conversation after a successful exchange ──────────────────
      if (exchangeOk) {
        const saved = [
          ...prevMessages,
          userMsg,
          { role: 'assistant' as const, content: fullResponse },
        ]
        fetch(`/api/conversations/${slug}`, {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ messages: saved, novel_title: title }),
        }).catch(() => { /* non-fatal */ })

        // ── Background summarisation for character mode ───────────────────
        // Every 16 messages (8 full turns), compress old messages into a
        // rolling memory note that the character carries forward.
        // We summarise everything older than the last 8 messages.
        if (chatMode === 'character' && characterName.trim()) {
          const totalAfter = saved.length
          const threshold  = summarizedUpTo + 16
          if (totalAfter >= threshold && totalAfter > 16) {
            const toSummarise = saved.slice(0, totalAfter - 8)
            setSummarizedUpTo(totalAfter)  // mark immediately to avoid double-firing
            fetch('/api/summarize', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({
                messages:      toSummarise.map(m => ({ role: m.role, content: m.content })),
                characterName: characterName.trim(),
                novelTitle:    title,
              }),
            })
              .then(r => r.ok ? r.json() : null)
              .then((data: { summary?: string } | null) => {
                if (data?.summary) setConvSummary(data.summary)
              })
              .catch(() => { /* non-fatal — falls back to sliding window */ })
          }
        }
      }
    }
  }

  // No-friction entry point. If the novel isn't indexed yet, kick off indexing
  // and auto-send the message the moment it's ready — no separate unlock step.
  function send() {
    const text = input.trim()
    if (!text || streaming) return
    if (chatMode === 'book' && text.length < 10) return
    if (chatMode === 'character' && !characterName.trim()) return

    if (embedState === 'ready') {
      setInput('')
      sendText(text)
      return
    }
    // Queue the message and start (or wait on) indexing.
    pendingTextRef.current = text
    setInput('')
    if (embedState === 'not_embedded' || embedState === 'unknown' || embedState === 'error') {
      startEmbed()
    }
  }

  // When indexing finishes, flush the queued message automatically.
  useEffect(() => {
    if (embedState === 'ready' && pendingTextRef.current) {
      const t = pendingTextRef.current
      pendingTextRef.current = null
      sendText(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedState])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  // ── Embed gate ──────────────────────────────────────────────────────────────
  if (embedState === 'unknown' || embedState === 'checking') {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-pulse text-sm text-zinc-500">Checking novel status…</div>
      </div>
    )
  }

  if (embedState === 'embedding') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
        <div className="relative">
          {/* Outer ring */}
          <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-zinc-800" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke="currentColor" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - embedPct / 100)}`}
              className="text-amber-500 transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-amber-400">{Math.round(embedPct)}%</span>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Processing chapters…</h2>
          {embedEta && (
            <p className="mt-1 text-xs text-zinc-500">{embedEta}</p>
          )}
          {!embedEta && embedPct === 0 && (
            <p className="mt-1 text-xs text-zinc-500">Starting up…</p>
          )}
        </div>
        <p className="max-w-xs text-xs text-zinc-600">
          Hang tight — we&apos;re reading every chapter so you can ask anything about this novel.
        </p>
        <div className="max-w-xs rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <p className="text-xs leading-relaxed text-amber-300/80">
            ✦ This one-time setup only happens the first time <em>anyone</em> opens this novel. After this, it loads instantly — for you and everyone else.
          </p>
        </div>
      </div>
    )
  }

  if (embedState === 'error') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-red-400">Something went wrong while processing this novel.</p>
        <button onClick={checkEmbed} className="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-amber-400 hover:border-amber-500/50 transition">
          Try Again
        </button>
      </div>
    )
  }

  // ── Chat UI ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 flex-col overflow-hidden">

      {/* ── Mode explanation popup ────────────────────────────────────────────── */}
      {showModeExplain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(6px)' }}>
          <div className="relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
            style={{ background: 'var(--nc-bg2)', borderColor: 'var(--nc-border)' }}>
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-amber-500/70">Two ways to read</p>
            <h2 className="mb-4 text-base font-bold" style={{ color: 'var(--nc-text)' }}>
              What&apos;s the difference?
            </h2>
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--nc-border)] p-3"
                style={{ background: 'var(--nc-bg)' }}>
                <p className="mb-1 text-sm font-semibold" style={{ color: 'var(--nc-text)' }}>📖 Ask the Book</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
                  Pure factual Q&amp;A. Ask anything about plot, lore, cultivation systems, character arcs, or spoilers. Every answer is grounded in actual chapter text. Perfect for researching a novel or settling debates.
                </p>
                <p className="mt-2 text-[10px] text-zinc-600">No persistent memory — each question draws fresh context from the chapters.</p>
              </div>
              <div className="rounded-xl border border-amber-500/25 p-3"
                style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(180,83,9,0.04) 100%)' }}>
                <p className="mb-1 text-sm font-semibold text-amber-300">🎭 Character Chat</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
                  Immersive roleplay. The character speaks as themselves — from lived experience, not as a narrator. They remember what you tell them, have opinions, and react emotionally. Best for deep dives into a character&apos;s psyche.
                </p>
                <p className="mt-2 text-[10px] text-amber-500/60">Memory builds over the conversation — the character won&apos;t forget what you shared.</p>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.setItem('nc-char-mode-seen', '1')
                setShowModeExplain(false)
              }}
              className="mt-5 w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition">
              Got it, let&apos;s go →
            </button>
          </div>
        </div>
      )}

      {/* ── Mode toggle ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-[var(--nc-border)] px-3 py-2.5">
        <div className="mx-auto flex w-full max-w-2xl rounded-xl border border-[var(--nc-border)] p-1 gap-1"
          style={{ background: 'var(--nc-bg)' }}>
          <button
            onClick={() => switchMode('book')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
              chatMode === 'book' ? 'bg-amber-500 text-black' : 'hover:bg-zinc-800/50'
            }`}
            style={chatMode !== 'book' ? { color: 'var(--nc-text2)' } : {}}>
            📖 Ask the Book
          </button>
          <button
            onClick={() => switchMode('character')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
              chatMode === 'character' ? 'bg-amber-500 text-black' : 'hover:bg-zinc-800/50'
            }`}
            style={chatMode !== 'character' ? { color: 'var(--nc-text2)' } : {}}>
            🎭 Character Chat
          </button>
        </div>

        {/* ── Spoiler ceiling toggle ── */}
        <div className="mt-2">
          <button
            onClick={() => setSpoilerOpen(v => !v)}
            className="flex items-center gap-1.5 text-xs transition"
            style={{ color: maxChapter ? 'rgb(245,158,11)' : 'var(--nc-text2)' }}>
            <span>{maxChapter ? '🛡' : '🔓'}</span>
            <span className="font-medium">
              {maxChapter ? `Spoiler shield: ch. 1–${maxChapter}` : 'Spoiler shield off'}
            </span>
            <svg className={`h-3 w-3 transition ${spoilerOpen ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {spoilerOpen && (
            <div className="mt-1.5 flex items-center gap-2 pl-5">
              <label className="text-xs" style={{ color: 'var(--nc-text2)' }}>I&apos;ve read up to chapter</label>
              <input
                type="number"
                min={1}
                value={maxChapter ?? ''}
                onChange={e => {
                  const v = parseInt(e.target.value, 10)
                  setMaxChapter(v > 0 ? v : null)
                }}
                placeholder="all"
                className="w-20 rounded-lg border border-[var(--nc-border)] px-2 py-1 text-xs outline-none focus:border-amber-500"
                style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}
              />
              {maxChapter && (
                <button
                  onClick={() => { setMaxChapter(null); setSpoilerOpen(false) }}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition">
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Character picker — shown only in character mode */}
        {chatMode === 'character' && (
          <div className="mt-2 space-y-2.5">

            {/* ── Active character chip ── */}
            {characterName ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1">
                  {characterProfile?.featured && (
                    <span className="text-amber-400 text-[10px]">✦</span>
                  )}
                  <span className="text-xs font-semibold text-amber-300">{characterName}</span>
                </div>
                <button onClick={clearCharacter}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition">
                  Change
                </button>
              </div>
            ) : (
              <>
                {/* ── Loading skeleton ── */}
                {charLoading && (
                  <div className="flex gap-1.5">
                    {[1,2,3].map(i => <div key={i} className="h-6 w-20 animate-pulse rounded-full bg-zinc-800" />)}
                  </div>
                )}

                {/* ── Curated characters ── */}
                {!charLoading && featuredChars.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-amber-500/70">
                      ✦ Curated Characters
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {featuredChars.map(c => (
                        <button key={c.name}
                          onClick={() => selectCharacter(c)}
                          className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-300 transition hover:bg-amber-500/20 hover:border-amber-500/60">
                          <span>✦</span>
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── No characters available / request ── */}
                {!charLoading && featuredChars.length === 0 && (
                  <div className="rounded-xl border border-[var(--nc-border)] p-3 text-center"
                    style={{ background: 'var(--nc-bg)' }}>
                    <p className="text-xs" style={{ color: 'var(--nc-text2)' }}>
                      No curated characters for this novel yet.
                    </p>
                    <p className="mt-1 text-[10px] text-zinc-500">
                      Characters are hand-crafted for accuracy. Want one added?
                    </p>
                  </div>
                )}
              </>
            )}

            {characterName && (
              <p className="text-[10px] text-zinc-600">
                Talking to <span className="text-amber-400">{characterName}</span> · 10 tokens per message
                {convSummary && (
                  <span className="ml-1.5 text-amber-500/50" title="Character remembers earlier messages via summary">· 🧠 memory active</span>
                )}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="text-5xl opacity-70">{chatMode === 'character' ? '🎭' : '✨'}</div>
            <p className="text-base text-zinc-300">
              {chatMode === 'character' && characterName
                ? <>You&apos;re now talking to <span className="text-amber-400 font-semibold">{characterName}</span></>
                : chatMode === 'character'
                ? 'Pick a character above to start roleplaying'
                : <>Ask anything about <span className="text-amber-400 font-semibold">{title}</span></>
              }
            </p>
            {chatMode === 'book' && (
            <div className="mt-1 flex w-full max-w-lg flex-col gap-3">
              {[
                'Explain this novel to me like I just picked it up',
                'What makes the MC different from other protagonists?',
                'What are the biggest plot twists without spoiling the ending?',
              ].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); inputRef.current?.focus() }}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-3.5 text-sm font-medium text-amber-400/90 hover:border-amber-500/60 hover:bg-amber-500/10 hover:text-amber-400 transition text-left"
                >
                  ✦ {q}
                </button>
              ))}
            </div>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap border ${
                msg.role === 'user'
                  ? 'rounded-br-sm border-violet-500/30'
                  : msg.isError
                    ? 'rounded-bl-sm border-red-500/30'
                    : 'rounded-bl-sm border-amber-500/25'
              }`}
              style={msg.role === 'user'
                ? {
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(99,102,241,0.10) 100%)',
                    color: 'var(--nc-text)',
                  }
                : msg.isError
                  ? { background: 'var(--nc-bg3)', color: '#f87171' }
                  : {
                      background: 'linear-gradient(135deg, rgba(245,158,11,0.13) 0%, rgba(180,83,9,0.07) 100%)',
                      color: 'var(--nc-text)',
                    }
              }
            >
              {msg.content}
              {msg.role === 'assistant' && msg.content === '' && (
                <span className="inline-block h-4 w-1 animate-pulse bg-zinc-400 ml-0.5" />
              )}
              {/* Shop link for out-of-tokens errors */}
              {msg.isError && msg.content.includes('shop') && (
                <a
                  href="/shop"
                  className="mt-2 block text-xs font-semibold text-amber-400 underline underline-offset-2"
                >
                  Go to Shop →
                </a>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-[var(--nc-border)] p-3" style={{ background: 'var(--nc-bg)' }}>
        {/* Export */}
        {messages.length > 0 && (
          <div className="mb-2 flex justify-end">
            <button
              onClick={() => {
                const txt = messages.map(m => `${m.role === 'user' ? 'You' : title}: ${m.content}`).join('\n\n')
                const a = document.createElement('a')
                a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }))
                a.download = `${title.replace(/\s+/g, '_')}_chat.txt`
                a.click()
              }}
              className="flex items-center gap-1 text-xs transition"
              style={{ color: 'var(--nc-text2)' }}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export chat
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about the story, characters, cultivation system…"
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-[var(--nc-border)] px-4 py-3.5 text-base placeholder-zinc-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition max-h-40 overflow-y-auto"
            style={{ background: 'var(--nc-bg2)', color: 'var(--nc-text)', fieldSizing: 'content' } as React.CSSProperties}
            disabled={streaming}
          />
          <button
            onClick={send}
            disabled={
              streaming ||
              !input.trim() ||
              (chatMode === 'book' && input.trim().length < 10) ||
              (chatMode === 'character' && !characterName.trim())
            }
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-black transition hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {streaming ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>
        <p className="mt-1.5 text-center text-xs text-zinc-600">
          {chatMode === 'book' && input.trim().length > 0 && input.trim().length < 10
            ? <span className="text-amber-500/70">{10 - input.trim().length} more character{10 - input.trim().length !== 1 ? 's' : ''} needed</span>
            : chatMode === 'character' && characterName
              ? <span>10 tokens · talking to <span className="text-amber-500/60">{characterName}</span></span>
              : <span>10 tokens per message<span className="hidden sm:inline"> · Enter to send · Shift+Enter for new line</span></span>
          }
        </p>
      </div>
    </div>
  )
}
