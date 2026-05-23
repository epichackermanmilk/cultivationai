'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  slug:   string
  title:  string
  author: string
}

type EmbedState = 'unknown' | 'checking' | 'not_embedded' | 'embedding' | 'ready' | 'error'

export default function Chat({ slug, title, author }: Props) {
  const [messages, setMessages]       = useState<Message[]>([])
  const [input, setInput]             = useState('')
  const [streaming, setStreaming]     = useState(false)
  const [embedState, setEmbedState]   = useState<EmbedState>('unknown')
  const [embedPct, setEmbedPct]       = useState(0)
  const bottomRef                     = useRef<HTMLDivElement>(null)
  const inputRef                      = useRef<HTMLTextAreaElement>(null)
  const pollRef                       = useRef<ReturnType<typeof setInterval> | null>(null)

  // Check embedding status on mount
  useEffect(() => {
    checkEmbed()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

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
        startPolling()
      } else {
        setEmbedState('not_embedded')
      }
    } catch {
      setEmbedState('error')
    }
  }

  async function startEmbed() {
    setEmbedState('embedding')
    setEmbedPct(0)
    await fetch(`/api/embed/${slug}`, { method: 'POST' })
    startPolling()
  }

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const res  = await fetch(`/api/embed/${slug}`)
      const data = await res.json()
      if (data.embedded || data.status === 'done') {
        clearInterval(pollRef.current!)
        setEmbedState('ready')
        setEmbedPct(100)
      } else if (data.status === 'processing') {
        setEmbedPct(data.pct ?? 0)
      } else if (data.status === 'error') {
        clearInterval(pollRef.current!)
        setEmbedState('error')
      }
    }, 2500)
  }

  async function send() {
    const text = input.trim()
    if (!text || streaming || embedState !== 'ready') return

    const userMsg: Message   = { role: 'user', content: text }
    const assistantMsg: Message = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setStreaming(true)

    try {
      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ slug, title, author, message: text, history }),
      })

      if (!res.body) throw new Error('No response body')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content + chunk,
          }
          return updated
        })
      }
    } catch (e) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: 'Sorry, something went wrong. Please try again.',
        }
        return updated
      })
    } finally {
      setStreaming(false)
      setTimeout(() => inputRef.current?.focus(), 50)
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
        </p>
        <button
          onClick={startEmbed}
          className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition-colors"
        >
          Unlock &ldquo;{title}&rdquo;
        </button>
      </div>
    )
  }

  if (embedState === 'embedding') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-4xl">⚙️</div>
        <h2 className="text-sm font-semibold text-zinc-100">Processing chapters…</h2>
        <div className="w-64 overflow-hidden rounded-full bg-zinc-800 h-2">
          <div
            className="h-full rounded-full bg-amber-500 transition-all duration-500"
            style={{ width: `${embedPct}%` }}
          />
        </div>
        <p className="text-xs text-zinc-500">{embedPct}% complete</p>
      </div>
    )
  }

  if (embedState === 'error') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-red-400">Something went wrong. Please try again.</p>
        <button onClick={checkEmbed} className="text-xs text-amber-400 hover:underline">
          Retry
        </button>
      </div>
    )
  }

  // ── Chat UI ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center opacity-60">
            <div className="text-3xl">✨</div>
            <p className="text-sm text-zinc-400">
              Ask anything about <span className="text-amber-400">{title}</span>
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {[
                'Who are the main characters?',
                'What is the cultivation system?',
                'Summarise the first arc',
              ].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); inputRef.current?.focus() }}
                  className="rounded-lg border border-[var(--nc-border)] px-3 py-1.5 text-xs hover:border-amber-500/50 transition" style={{ color: 'var(--nc-text2)' }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'
              }`}
              style={msg.role === 'user'
                ? { background: '#f59e0b', color: '#000' }
                : { background: 'var(--nc-bg3)', color: 'var(--nc-text)' }
              }
            >
              {msg.content}
              {msg.role === 'assistant' && msg.content === '' && (
                <span className="inline-block h-4 w-1 animate-pulse bg-zinc-400 ml-0.5" />
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
            disabled={streaming || !input.trim()}
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
        <p className="mt-1.5 text-center text-xs text-zinc-600">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
