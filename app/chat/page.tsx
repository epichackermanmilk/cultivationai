'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'
import TokenWidget from '@/components/TokenWidget'

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
function NovelSelector({
  novels,
  selected,
  onToggle,
}: {
  novels:   Novel[]
  selected: Set<string>
  onToggle: (slug: string) => void
}) {
  const [search,    setSearch]    = useState('')
  const [genre,     setGenre]     = useState('')
  const [minCh,     setMinCh]     = useState('')
  const [maxCh,     setMaxCh]     = useState('')

  const allGenres = useMemo(() => {
    const s = new Set<string>()
    novels.forEach(n => n.genres.forEach(g => s.add(g)))
    return [...s].sort()
  }, [novels])

  const visible = useMemo(() => {
    return novels.filter(n => {
      if (search && !n.title.toLowerCase().includes(search.toLowerCase()) &&
          !n.author.toLowerCase().includes(search.toLowerCase())) return false
      if (genre && !n.genres.includes(genre)) return false
      if (minCh && n.total_chapters < Number(minCh)) return false
      if (maxCh && n.total_chapters > Number(maxCh)) return false
      return true
    })
  }, [novels, search, genre, minCh, maxCh])

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
        <select
          value={genre} onChange={e => setGenre(e.target.value)}
          className="mb-2 w-full rounded-lg border border-[var(--nc-border)] px-3 py-2 text-xs outline-none focus:border-amber-500"
          style={{ background: 'var(--nc-bg3)', color: 'var(--nc-text)' }}
        >
          <option value="">All genres</option>
          {allGenres.map(g => <option key={g} value={g}>{g}</option>)}
        </select>

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
  const [novels,   setNovels]   = useState<Novel[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [messages, setMessages] = useState<Message[]>([])
  const [input,    setInput]    = useState('')
  const [sideOpen, setSideOpen] = useState(true)

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

  const sendDemo = () => {
    const text = input.trim()
    if (!text) return
    const userMsg: Message = { role: 'user', content: text }
    const asstMsg: Message = {
      role: 'assistant',
      content: selected.size === 0
        ? '⚠️ No novels selected. Add some novels from the panel on the left first.'
        : `[PROTOTYPE — no AI connected yet]\n\nYou asked about ${selected.size} novel${selected.size !== 1 ? 's' : ''}: ${selectedNovels.map(n => n.title).join(', ')}.\n\nIn production this will search across all selected novels' chapters and synthesise an answer.`,
    }
    setMessages(prev => [...prev, userMsg, asstMsg])
    setInput('')
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>
      {/* Header */}
      <header className="shrink-0 flex items-center gap-3 border-b border-[var(--nc-border)] px-4 py-3" style={{ background: 'var(--nc-bg)' }}>
        <Link href="/" className="text-zinc-400 hover:text-zinc-100 transition text-sm">← Library</Link>
        <div className="h-4 w-px bg-zinc-700" />
        <h1 className="text-sm font-bold text-amber-400">NovelCodex</h1>
        <span className="text-xs text-zinc-600">Multi-Novel Chat</span>
        <div className="flex-1" />
        <TokenWidget />
        <ThemeToggle />
        <button
          onClick={() => setSideOpen(v => !v)}
          className="rounded-lg border border-[var(--nc-border)] px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition"
        >
          {sideOpen ? 'Hide' : 'Show'} Library
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Novel selector sidebar */}
        {sideOpen && (
          <aside className="w-72 shrink-0 border-r border-[var(--nc-border)] overflow-hidden flex flex-col" style={{ background: 'var(--nc-bg2)' }}>
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
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center opacity-60">
                <div className="text-4xl">✦</div>
                <p className="text-sm text-zinc-400 max-w-sm">
                  Select novels from the library panel, then ask anything across all of them at once.
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  {[
                    'Who is the strongest main character across these novels?',
                    'Compare the cultivation systems in each novel',
                    'Which of these novels has the best character development?',
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-amber-500/50 hover:text-zinc-200 transition"
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
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-[var(--nc-border)] p-3" style={{ background: 'var(--nc-bg)' }}>
            {selected.size === 0 && (
              <p className="mb-2 text-center text-xs text-amber-600/80">
                ← Select at least one novel to start chatting
              </p>
            )}
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDemo() } }}
                placeholder={selected.size > 0
                  ? `Ask about ${selectedNovels.map(n => n.title.split(' ')[0]).join(', ')}…`
                  : 'Select novels first…'
                }
                rows={1}
                className="flex-1 resize-none rounded-xl border border-[var(--nc-border)] px-3 py-2.5 text-sm placeholder-zinc-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition max-h-32 overflow-y-auto"
                style={{ background: 'var(--nc-bg2)', color: 'var(--nc-text)', fieldSizing: 'content' } as React.CSSProperties}
              />
              <button
                onClick={sendDemo}
                disabled={!input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-black transition hover:bg-amber-400 disabled:opacity-40"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
            <p className="mt-1.5 text-center text-xs text-zinc-600">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      </div>
    </div>
  )
}
