'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import SiteHeader     from '@/components/SiteHeader'
import FeedbackWidget from '@/components/FeedbackWidget'
import { useAuth }    from '@/lib/auth-context'
import { matchesSearch } from '@/lib/search'

interface Novel {
  slug: string
  title: string
  author: string
  total_chapters: number
  genres: string[]
  cover_url: string
  description: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// ── Novel selector sidebar ────────────────────────────────────────────────────
// ── Genre multi-select dropdown (amenities style) ────────────────────────────
function GenreDropdown({
  allGenres, selected, onToggle, onClearAll,
}: {
  allGenres: string[]
  selected:  string[]
  onToggle:  (g: string) => void
  onClearAll: () => void
}) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const count = selected.length

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const visible = allGenres.filter(g => g.toLowerCase().includes(search.toLowerCase()))

  return (
    <div ref={ref} className="relative mb-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs transition"
        style={{
          borderColor: open ? 'var(--nc-amber, #f59e0b)' : 'var(--nc-border)',
          color: 'var(--nc-text)', background: 'var(--nc-bg3)',
        }}
      >
        <span>{count > 0 ? `${count} genre${count > 1 ? 's' : ''} selected` : 'All Genres'}</span>
        <svg
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute z-30 w-full mt-1 rounded-lg border shadow-xl overflow-hidden"
          style={{ background: 'var(--nc-bg2)', borderColor: 'var(--nc-border)' }}
        >
          {/* Search */}
          <div className="p-2" style={{ borderBottom: '1px solid var(--nc-border)' }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search genres…"
              className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none focus:border-amber-500"
              style={{ background: 'var(--nc-bg)', borderColor: 'var(--nc-border)', color: 'var(--nc-text)' }}
            />
          </div>

          {/* Checkbox list */}
          <div className="max-h-44 overflow-y-auto">
            {visible.length === 0 && (
              <p className="px-3 py-2 text-xs text-center text-zinc-500">No genres match</p>
            )}
            {visible.map(g => (
              <button
                key={g}
                onClick={() => onToggle(g)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs transition hover:bg-zinc-800/50"
                style={{ color: 'var(--nc-text)' }}
              >
                <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition ${
                  selected.includes(g) ? 'border-amber-500 bg-amber-500' : 'border-zinc-600'
                }`}>
                  {selected.includes(g) && <span className="text-[8px] font-bold text-black leading-none">✓</span>}
                </span>
                {g}
              </button>
            ))}
          </div>

          {/* Footer */}
          {count > 0 && (
            <div className="flex items-center justify-end p-2" style={{ borderTop: '1px solid var(--nc-border)' }}>
              <button
                onClick={() => { onClearAll(); }}
                className="text-xs transition hover:text-zinc-200"
                style={{ color: 'var(--nc-text2)' }}
              >
                Clear ({count})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Novel selector sidebar ────────────────────────────────────────────────────
function NovelSelector({
  novels,
  selected,
  onToggle,
}: {
  novels:   Novel[]
  selected: Set<string>
  onToggle: (slug: string) => void
}) {
  const [search,         setSearch]     = useState('')
  const [selectedGenres, setSelGenres]  = useState<string[]>([])
  const [minCh,          setMinCh]      = useState('')
  const [maxCh,          setMaxCh]      = useState('')

  const allGenres = useMemo(() => {
    const s = new Set<string>()
    novels.forEach(n => n.genres.forEach(g => s.add(g)))
    return [...s].sort()
  }, [novels])

  const toggleGenre = (g: string) =>
    setSelGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])

  const visible = useMemo(() => {
    return novels.filter(n => {
      if (search && !matchesSearch(n.title, search) && !matchesSearch(n.author, search)) return false
      if (selectedGenres.length > 0 && !n.genres.some(g => selectedGenres.includes(g))) return false
      if (minCh && n.total_chapters < Number(minCh)) return false
      if (maxCh && n.total_chapters > Number(maxCh)) return false
      return true
    })
  }, [novels, search, selectedGenres, minCh, maxCh])

  const addAllVisible    = () => visible.forEach(n => { if (!selected.has(n.slug)) onToggle(n.slug) })
  const removeAllVisible = () => visible.forEach(n => { if (selected.has(n.slug))  onToggle(n.slug) })

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 p-4 border-b border-[var(--nc-border)]">
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--nc-text)' }}>Select Novels</h2>

        {/* Search */}
        <input
          type="text" placeholder="Search title or author…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="mb-2 w-full rounded-lg border border-[var(--nc-border)] px-3 py-2 text-xs placeholder-zinc-500 outline-none focus:border-amber-500"
          style={{ background: 'var(--nc-bg3)', color: 'var(--nc-text)' }}
        />

        {/* Genre filter */}
        <GenreDropdown
          allGenres={allGenres}
          selected={selectedGenres}
          onToggle={toggleGenre}
          onClearAll={() => setSelGenres([])}
        />

        {/* Chapter range */}
        <div className="mb-3 flex gap-2">
          <input type="number" placeholder="Min ch" value={minCh} onChange={e => setMinCh(e.target.value)}
            className="w-1/2 rounded-lg border border-[var(--nc-border)] px-2 py-1.5 text-xs outline-none focus:border-amber-500"
            style={{ background: 'var(--nc-bg3)', color: 'var(--nc-text)' }} />
          <input type="number" placeholder="Max ch" value={maxCh} onChange={e => setMaxCh(e.target.value)}
            className="w-1/2 rounded-lg border border-[var(--nc-border)] px-2 py-1.5 text-xs outline-none focus:border-amber-500"
            style={{ background: 'var(--nc-bg3)', color: 'var(--nc-text)' }} />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">{visible.length} shown</span>
          <div className="flex gap-2">
            <button onClick={addAllVisible} className="text-xs text-amber-400 hover:text-amber-300 transition">
              + Add all
            </button>
            <span className="text-zinc-700">|</span>
            <button onClick={removeAllVisible} className="text-xs text-zinc-500 hover:text-red-400 transition">
              − Remove all
            </button>
          </div>
        </div>
      </div>

      {/* Novel list */}
      <div className="flex-1 overflow-y-auto">
        {visible.map(n => {
          const on = selected.has(n.slug)
          return (
            <button
              key={n.slug}
              onClick={() => onToggle(n.slug)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-zinc-800/60 ${on ? 'bg-amber-500/10' : ''}`}
            >
              {/* Cover thumb */}
              <div className="h-10 w-7 shrink-0 overflow-hidden rounded bg-zinc-800">
                {n.cover_url
                  ? <img src={n.cover_url} alt="" className="h-full w-full object-cover" />
                  : <div className="h-full w-full bg-zinc-700" />
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-xs font-medium ${on ? 'text-amber-400' : 'text-zinc-200'}`}>{n.title}</p>
                <p className="truncate text-xs text-zinc-500">{n.total_chapters.toLocaleString()} ch</p>
              </div>
              <div className={`h-4 w-4 shrink-0 rounded border transition ${on ? 'border-amber-500 bg-amber-500' : 'border-zinc-600'}`}>
                {on && <svg viewBox="0 0 16 16" fill="none" className="h-full w-full p-0.5"><path d="M3 8l3.5 3.5L13 5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main chat page ────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { user, updateTokens } = useAuth()
  const [novels,   setNovels]   = useState<Novel[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [messages, setMessages] = useState<Message[]>([])
  const [input,    setInput]    = useState('')
  const [sending,  setSending]  = useState(false)
  const [chatError, setChatError] = useState('')
  const [sideOpen, setSideOpen] = useState(true)
  const touchStartX = useRef<number | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (delta > 50) setSideOpen(true)   // swipe right → open
    if (delta < -50) setSideOpen(false) // swipe left  → close
  }, [])

  useEffect(() => {
    fetch('/api/novels')
      .then(r => r.json())
      .then(d => { setNovels(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const toggle = (slug: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(slug) ? next.delete(slug) : next.add(slug)
      return next
    })
  }

  const selectedNovels = novels.filter(n => selected.has(n.slug))

  const sendDemo = async () => {
    const text = input.trim()
    if (!text || selected.size === 0 || sending) return
    if (!user) { setChatError('Sign in to chat.'); return }

    setChatError('')
    setSending(true)
    setInput('')

    // history BEFORE we append the new turn
    const priorHistory = messages.map(m => ({ role: m.role, content: m.content }))
    const asstIndex = messages.length + 1   // index of the assistant message we're about to add

    setMessages(prev => [...prev, { role: 'user', content: text }, { role: 'assistant', content: '' }])

    try {
      const r = await fetch('/api/chat/multi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          novels:  selectedNovels.map(n => ({ slug: n.slug, title: n.title })),
          history: priorHistory,
        }),
      })

      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        const msg = r.status === 402
          ? '⚡ You\'re out of tokens. Visit the shop to get more and keep chatting.'
          : (d.error ?? 'Something went wrong. Please try again.')
        setMessages(prev => { const a = [...prev]; a[asstIndex] = { role: 'assistant', content: msg }; return a })
        setSending(false)
        return
      }

      const remaining = r.headers.get('X-Tokens-Remaining')
      if (remaining !== null) { const n = parseInt(remaining, 10); if (!isNaN(n)) updateTokens(n) }

      const reader  = r.body!.getReader()
      const decoder = new TextDecoder()
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setMessages(prev => { const a = [...prev]; a[asstIndex] = { role: 'assistant', content: full }; return a })
      }
    } catch {
      setMessages(prev => { const a = [...prev]; a[asstIndex] = { role: 'assistant', content: 'Network error — please try again.' }; return a })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden pb-16 sm:pb-0" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>
      {/* Header */}
      <SiteHeader maxWidth="max-w-[1400px]" rootClassName="shrink-0" />

      <div className="flex flex-1 overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {/* Mobile backdrop — closes sidebar when tapping outside, sits below header */}
        {sideOpen && (
          <div
            className="fixed top-[57px] inset-x-0 bottom-0 z-20 bg-black/60 sm:hidden"
            onClick={() => setSideOpen(false)}
          />
        )}

        {/* Left-edge arrow tab — slides with the sidebar. Works on mobile AND desktop.
            Closed: docked at far left. Open: sits at the sidebar's right edge
            (85vw/20rem on mobile, 18rem/w-72 on desktop). */}
        <button
          onClick={() => setSideOpen(v => !v)}
          className={`fixed z-40 flex items-center justify-center transition-[left] duration-200 ease-out ${
            sideOpen ? 'left-[min(85vw,20rem)] sm:left-80' : 'left-0'
          }`}
          style={{
            top: 'calc(50dvh + 28px)',
            transform: 'translateY(-50%)',
            height: '56px',
            width: '20px',
            borderRadius: '0 8px 8px 0',
            background: 'var(--nc-bg2)',
            border: '1px solid var(--nc-border)',
            borderLeft: 'none',
            boxShadow: '2px 0 10px rgba(0,0,0,0.35)',
          }}
          aria-label={sideOpen ? 'Hide library panel' : 'Show library panel'}
          title={sideOpen ? 'Hide library' : 'Show library'}
        >
          <svg
            viewBox="0 0 6 10"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 11, height: 11, color: 'var(--nc-text2)' }}
          >
            {sideOpen
              ? <path d="M5 1L1 5L5 9" />
              : <path d="M1 1L5 5L1 9" />
            }
          </svg>
        </button>

        {/* Novel selector sidebar — overlay on mobile (below header), inline on desktop */}
        {sideOpen && (
          <aside
            className="fixed top-[57px] bottom-0 left-0 z-30 flex w-[85vw] max-w-xs flex-col overflow-hidden border-r border-[var(--nc-border)] sm:relative sm:top-auto sm:bottom-auto sm:z-auto sm:w-80 sm:shrink-0"
            style={{ background: 'var(--nc-bg2)' }}
          >
            {loading
              ? <div className="p-4 text-xs text-zinc-500 animate-pulse">Loading novels…</div>
              : <NovelSelector novels={novels} selected={selected} onToggle={toggle} />
            }
          </aside>
        )}

        {/* Main chat area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Selected novels strip */}
          {selectedNovels.length > 0 && (
            <div className="shrink-0 flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/40 px-4 py-2 overflow-x-auto">
              <span className="shrink-0 text-xs text-zinc-500">Chatting with:</span>
              {selectedNovels.map(n => (
                <span key={n.slug} className="shrink-0 flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-400">
                  {n.title.length > 30 ? n.title.slice(0, 28) + '…' : n.title}
                  <button onClick={() => toggle(n.slug)} className="text-amber-600 hover:text-amber-400">×</button>
                </span>
              ))}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="text-4xl opacity-60">✦</div>
                <p className="text-sm max-w-sm" style={{ color: 'var(--nc-text2)' }}>
                  Select novels from the library panel, then ask anything across all of them at once.
                </p>
                <div className="mt-2 flex flex-col gap-3 w-full max-w-xl">
                  {[
                    'Who is the strongest main character across these novels?',
                    'Compare the cultivation systems in each novel',
                    'Which of these novels has the best character development?',
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="rounded-3xl border border-amber-500/30 bg-amber-500/5 px-6 py-4 text-sm font-medium text-amber-400/80 hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-400 transition text-left leading-relaxed"
                    >
                      ✦ {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap border ${
                    msg.role === 'user'
                      ? 'rounded-br-sm border-violet-500/30'
                      : 'rounded-bl-sm border-amber-500/25'
                  }`}
                  style={msg.role === 'user'
                    ? {
                        background: 'linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(99,102,241,0.10) 100%)',
                        color: 'var(--nc-text)',
                      }
                    : {
                        background: 'linear-gradient(135deg, rgba(245,158,11,0.13) 0%, rgba(180,83,9,0.07) 100%)',
                        color: 'var(--nc-text)',
                      }
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-[var(--nc-border)] p-4" style={{ background: 'var(--nc-bg)' }}>
            {/* Export */}
            {messages.length > 0 && (
              <div className="mb-2 flex justify-end">
                <button
                  onClick={() => {
                    const lines = messages.map(m =>
                      `${m.role === 'user' ? 'You' : 'NovelCodex'}: ${m.content}`
                    ).join('\n\n')
                    const a = document.createElement('a')
                    a.href = URL.createObjectURL(new Blob([lines], { type: 'text/plain' }))
                    a.download = 'novelcodex_chat.txt'
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
            {selected.size === 0 && (
              <p className="mb-2 text-center text-xs font-medium"
                style={{
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                ← Select at least one novel to start chatting
              </p>
            )}
            <div className="flex items-end gap-2.5">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDemo() } }}
                placeholder={selected.size > 0
                  ? `Ask about ${selectedNovels.map(n => n.title.split(' ')[0]).join(', ')}…`
                  : 'Select novels first…'
                }
                rows={1}
                disabled={sending}
                className="flex-1 resize-none rounded-2xl border border-[var(--nc-border)] px-4 py-3.5 text-sm placeholder-zinc-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition max-h-40 overflow-y-auto disabled:opacity-60"
                style={{ background: 'var(--nc-bg2)', color: 'var(--nc-text)', fieldSizing: 'content' } as React.CSSProperties}
              />
              <button
                onClick={sendDemo}
                disabled={!input.trim() || selected.size === 0 || sending}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-black transition hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                )}
              </button>
            </div>
            {chatError && <p className="mt-1.5 text-center text-xs text-rose-400">{chatError}</p>}
            <p className="mt-1.5 text-center text-xs text-zinc-600">Every message costs 15 tokens — make each one count · Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      </div>
      <FeedbackWidget />
    </div>
  )
}
