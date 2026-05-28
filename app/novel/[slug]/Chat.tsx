'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'

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
  const [charSuggestions, setCharSugg]  = useState<string[]>([])
  const [charLoading, setCharLoading]   = useState(false)
  const [embedError, setEmbedError]     = useState<string | null>(null)
  const bottomRef                       = useRef<HTMLDivElement>(null)
  const inputRef                        = useRef<HTMLTextAreaElement>(null)
  const pollRef                         = useRef<ReturnType<typeof setInterval> | null>(null)
  const embedStartRef                   = useRef<number | null>(null)

  // Check embedding status on mount (also resets history state on slug change)
  useEffect(() => {
    setMessages([])
    setHistLoaded(false)
    setEmbedPct(0)
    setEmbedEta(null)
    setEmbedError(null)
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

  // Load character suggestions once the novel is ready
  useEffect(() => {
    if (embedState !== 'ready' || charSuggestions.length > 0) return
    setCharLoading(true)
    fetch(`/api/character/${slug}`)
      .then(r => r.ok ? r.json() : { characters: [] })
      .then(data => {
        if (Array.isArray(data.characters)) setCharSugg(data.characters)
      })
      .catch(() => {})
      .finally(() => setCharLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedState, slug])

  // Clear messages and character state when switching modes
  function switchMode(m: ChatMode) {
    if (m === chatMode) return
    setChatMode(m)
    setMessages([])
    setCharName('')
    setInput('')
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
        setEmbedState('not_embedded')
        return
      }
      if (res.status === 402) {
        // Not enough tokens — stay on the gate screen with a message
        setEmbedState('not_embedded')
        setEmbedError('Not enough tokens to unlock this novel. Visit the shop to get more.')
        return
      }
      // If already embedded (200 with embedded:true), jump straight to ready
      if (res.ok) {
        const data = await res.json()
        if (data.embedded || data.status === 'done') {
          setEmbedState('ready')
          // Update token display if server returned remaining balance
          if (data.tokensRemaining !== undefined) updateTokens(data.tokensRemaining)
          return
        }
        // Update token display for the deduction
        if (data.tokensRemaining !== undefined) updateTokens(data.tokensRemaining)
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

  async function send() {
    const text = input.trim()
    if (!text || streaming || embedState !== 'ready') return
    // In character mode, require a character name to be set
    if (chatMode === 'character' && !characterName.trim()) return

    const userMsg: Message      = { role: 'user',      content: text }
    const assistantMsg: Message = { role: 'assistant', content: '' }
    // Snapshot current messages for history (before we add the new pair)
    const prevMessages = messages
    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setStreaming(true)

    let fullResponse = ''
    let exchangeOk   = false

    try {
      const history = prevMessages.slice(-8).map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          slug, title, author, message: text, history,
          ...(chatMode === 'character' && characterName.trim()
            ? { characterName: characterName.trim() }
            : {}),
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
      }
    }
  }

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

  if (embedState === 'not_embedded') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-4xl">📖</div>
        <h2 className="text-lg font-semibold text-zinc-100">
          Ready to unlock this novel?
        </h2>
        <p className="max-w-xs text-sm text-zinc-400">
          We&apos;ll process all chapters and build a searchable knowledge base so you can chat with the story.
          This takes a few minutes.
        </p>
        {embedError ? (
          <div className="flex max-w-xs flex-col items-center gap-3">
            <p className="text-sm text-red-400">{embedError}</p>
            <a href="/shop"
              className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition-colors">
              Get More Tokens →
            </a>
          </div>
        ) : (
          <button
            onClick={startEmbed}
            className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition-colors"
          >
            Unlock &ldquo;{title}&rdquo;
          </button>
        )}
        <p className="text-xs text-zinc-600">Costs 50 tokens to unlock · 10 tokens per message after</p>
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

      {/* ── Mode toggle ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-[var(--nc-border)] px-3 py-2">
        <div className="flex rounded-lg border border-[var(--nc-border)] p-0.5 gap-0.5"
          style={{ background: 'var(--nc-bg)' }}>
          <button
            onClick={() => switchMode('book')}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${
              chatMode === 'book' ? 'bg-amber-500 text-black' : 'hover:bg-zinc-800/50'
            }`}
            style={chatMode !== 'book' ? { color: 'var(--nc-text2)' } : {}}>
            📖 Ask the Book
          </button>
          <button
            onClick={() => switchMode('character')}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${
              chatMode === 'character' ? 'bg-amber-500 text-black' : 'hover:bg-zinc-800/50'
            }`}
            style={chatMode !== 'character' ? { color: 'var(--nc-text2)' } : {}}>
            🎭 Character Chat
          </button>
        </div>

        {/* Character picker — shown only in character mode */}
        {chatMode === 'character' && (
          <div className="mt-2">
            {/* Suggestions */}
            {charLoading && (
              <div className="mb-2 flex gap-1.5">
                {[1,2,3].map(i => <div key={i} className="h-6 w-20 animate-pulse rounded-full bg-zinc-800" />)}
              </div>
            )}
            {!charLoading && charSuggestions.length > 0 && !characterName && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {charSuggestions.map(c => (
                  <button key={c} onClick={() => setCharName(c)}
                    className="rounded-full border border-[var(--nc-border)] px-2.5 py-0.5 text-xs transition hover:border-amber-500/50 hover:text-amber-400"
                    style={{ color: 'var(--nc-text2)' }}>
                    {c}
                  </button>
                ))}
              </div>
            )}
            {/* Name input */}
            <div className="flex items-center gap-2">
              <input
                value={characterName}
                onChange={e => setCharName(e.target.value)}
                placeholder="Type or pick a character name…"
                className="flex-1 rounded-lg border border-[var(--nc-border)] bg-[var(--nc-bg2)] px-3 py-1.5 text-xs placeholder-zinc-500 outline-none focus:border-amber-500 transition"
                style={{ color: 'var(--nc-text)' }}
                maxLength={80}
              />
              {characterName && (
                <button onClick={() => setCharName('')}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition">
                  ✕
                </button>
              )}
            </div>
            {characterName && (
              <p className="mt-1 text-[10px] text-zinc-500">
                Chatting as <span className="text-amber-400 font-medium">{characterName}</span> · 10 tokens per message
              </p>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center opacity-60">
            <div className="text-3xl">{chatMode === 'character' ? '🎭' : '✨'}</div>
            <p className="text-sm text-zinc-400">
              {chatMode === 'character' && characterName
                ? <>You&apos;re now talking to <span className="text-amber-400">{characterName}</span></>
                : chatMode === 'character'
                ? 'Pick a character above to start roleplaying'
                : <>Ask anything about <span className="text-amber-400">{title}</span></>
              }
            </p>
            {chatMode === 'book' && (
            <div className="mt-2 flex flex-col gap-2">
              {[
                'Who are the main characters?',
                'What is the cultivation system?',
                'Summarise the first arc',
              ].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); inputRef.current?.focus() }}
                  className="rounded-lg border border-[var(--nc-border)] px-3 py-1.5 text-xs hover:border-amber-500/50 transition"
                  style={{ color: 'var(--nc-text2)' }}
                >
                  {q}
                </button>
              ))}
            </div>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'
              } ${msg.isError ? 'border border-red-500/30' : ''}`}
              style={msg.role === 'user'
                ? { background: '#f59e0b', color: '#000' }
                : msg.isError
                  ? { background: 'var(--nc-bg3)', color: '#f87171' }
                  : { background: 'var(--nc-bg3)', color: 'var(--nc-text)' }
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
            className="flex-1 resize-none rounded-xl border border-[var(--nc-border)] px-3 py-2.5 text-sm placeholder-zinc-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition max-h-32 overflow-y-auto"
            style={{ background: 'var(--nc-bg2)', color: 'var(--nc-text)', fieldSizing: 'content' } as React.CSSProperties}
            disabled={streaming}
          />
          <button
            onClick={send}
            disabled={streaming || !input.trim() || (chatMode === 'character' && !characterName.trim())}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-black transition hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {streaming ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>
        <p className="mt-1.5 text-center text-xs text-zinc-600">
          {chatMode === 'character' && characterName
            ? `10 tokens · talking to ${characterName} · Enter to send`
            : '10 tokens per message · Enter to send · Shift+Enter for new line'}
        </p>
      </div>
    </div>
  )
}
