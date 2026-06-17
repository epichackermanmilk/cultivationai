'use client'

// TestChat — purple/glass port of app/novel/[slug]/Chat.tsx for the /test* redesign.
// Logic is identical to production (embed gate, Ask-the-Book vs Character modes,
// streaming, conversation persistence, rolling character memory, spoiler shield);
// only the styling changes. Reuses the same APIs (/api/chat, /api/embed,
// /api/conversations, /api/character, /api/summarize). The page must set --v.

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { track } from '@/lib/analytics'

interface Message { role: 'user' | 'assistant'; content: string; isError?: boolean }
interface Props { slug: string; title: string; author: string }
type EmbedState = 'unknown' | 'checking' | 'not_embedded' | 'embedding' | 'ready' | 'error'
type ChatMode = 'book' | 'character'
interface CharProfile {
  name: string; speech_style?: string; core_traits?: string[]; motivation?: string
  key_relationships?: { name: string; relation: string }[]; era_note?: string; featured?: boolean
}

const ACCENT = 'rgb(var(--v))'

export default function TestChat({ slug, title, author }: Props) {
  const { updateTokens } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [embedState, setEmbedState] = useState<EmbedState>('unknown')
  const [embedPct, setEmbedPct] = useState(0)
  const [embedEta, setEmbedEta] = useState<string | null>(null)
  const [historyLoaded, setHistLoaded] = useState(false)
  const [chatMode, setChatMode] = useState<ChatMode>('book')
  const [characterName, setCharName] = useState('')
  const [characterProfile, setCharProf] = useState<CharProfile | null>(null)
  const [featuredChars, setFeatured] = useState<CharProfile[]>([])
  const [charLoading, setCharLoading] = useState(false)
  const [convSummary, setConvSummary] = useState('')
  const [summarizedUpTo, setSummarizedUpTo] = useState(0)
  const [maxChapter, setMaxChapter] = useState<number | null>(null)
  const [spoilerOpen, setSpoilerOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const embedStartRef = useRef<number | null>(null)
  const pendingTextRef = useRef<string | null>(null)
  const urlCharRef = useRef('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const char = params.get('char') ?? ''
    const mode = params.get('mode')
    if (char) { urlCharRef.current = char; setCharName(char) }
    if (mode === 'character') setChatMode('character')
  }, [])

  useEffect(() => {
    setMessages([]); setHistLoaded(false); setEmbedPct(0); setEmbedEta(null)
    checkEmbed()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  useEffect(() => {
    if (embedState !== 'ready' || historyLoaded) return
    setHistLoaded(true)
    fetch(`/api/conversations/${slug}`).then(r => r.ok ? r.json() : { messages: [] }).then(data => {
      const saved = Array.isArray(data.messages) ? data.messages : []
      if (saved.length > 0) setMessages(saved.map((m: { role: string; content: string }) => ({ role: m.role as 'user' | 'assistant', content: m.content })))
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedState, slug])

  useEffect(() => {
    if (embedState !== 'ready' || featuredChars.length > 0) return
    setCharLoading(true)
    fetch(`/api/character/${slug}`).then(r => r.ok ? r.json() : {}).then((data: Record<string, unknown>) => {
      const featured: CharProfile[] = Array.isArray(data.featured) ? data.featured as CharProfile[] : []
      if (featured.length) setFeatured(featured)
      const urlChar = urlCharRef.current
      if (urlChar) {
        const match = featured.find(p => p.name.toLowerCase() === urlChar.toLowerCase())
        if (match) { setCharProf(match); setCharName(match.name) }
      }
    }).catch(() => {}).finally(() => setCharLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedState, slug])

  function selectCharacter(p: CharProfile) { setCharName(p.name); setCharProf(p); setMessages([]); setConvSummary(''); setSummarizedUpTo(0) }
  function clearCharacter() { setCharName(''); setCharProf(null); setMessages([]); setConvSummary(''); setSummarizedUpTo(0) }
  function switchMode(m: ChatMode) {
    if (m === chatMode) return
    setChatMode(m); setMessages([]); setConvSummary(''); setSummarizedUpTo(0); setCharName(''); setCharProf(null); setInput('')
  }

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function checkEmbed() {
    setEmbedState('checking')
    try {
      const res = await fetch(`/api/embed/${slug}`)
      const data = await res.json()
      if (data.embedded) setEmbedState('ready')
      else if (data.status === 'processing') { setEmbedState('embedding'); setEmbedPct(data.pct ?? 0); if (!embedStartRef.current) embedStartRef.current = Date.now(); startPolling() }
      else setEmbedState('not_embedded')
    } catch { setEmbedState('error') }
  }

  async function startEmbed() {
    setEmbedPct(0); setEmbedEta(null); embedStartRef.current = Date.now()
    try {
      const res = await fetch(`/api/embed/${slug}`, { method: 'POST' })
      if (res.status === 401) {
        setEmbedState('not_embedded'); pendingTextRef.current = null
        setMessages(prev => [...prev, { role: 'assistant', content: 'Please sign in to chat with this novel — it’s free.', isError: true }])
        return
      }
      if (res.ok) { const data = await res.json(); if (data.embedded || data.status === 'done') { setEmbedState('ready'); return } }
    } catch { /* handled by poll */ }
    setEmbedState('embedding'); startPolling()
  }

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/embed/${slug}`)
        const data = await res.json()
        if (data.embedded || data.status === 'done') {
          clearInterval(pollRef.current!); pollRef.current = null; embedStartRef.current = null
          setEmbedState('ready'); setEmbedPct(100); setEmbedEta(null)
        } else if (data.status === 'processing') {
          const pct = data.pct ?? 0; setEmbedPct(pct)
          if (embedStartRef.current && pct > 2) {
            const elapsed = (Date.now() - embedStartRef.current) / 1000
            const remaining = Math.max(0, Math.round(elapsed / (pct / 100) - elapsed))
            setEmbedEta(remaining > 60 ? `~${Math.ceil(remaining / 60)} min remaining` : `~${remaining}s remaining`)
          }
        } else if (data.status === 'error') { clearInterval(pollRef.current!); pollRef.current = null; setEmbedState('error') }
      } catch { /* keep polling */ }
    }, 2500)
  }

  async function sendText(text: string) {
    if (!text || streaming) return
    const userMsg: Message = { role: 'user', content: text }
    const assistantMsg: Message = { role: 'assistant', content: '' }
    const prevMessages = messages
    setMessages(prev => [...prev, userMsg, assistantMsg]); setInput(''); setStreaming(true)
    track('chat_message', { mode: chatMode, slug })
    let fullResponse = ''; let exchangeOk = false
    try {
      const history = prevMessages.slice(-8).map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug, title, author, message: text, history,
          ...(maxChapter ? { maxChapter } : {}),
          ...(chatMode === 'character' && characterName.trim() ? { characterName: characterName.trim(), characterProfile: characterProfile ?? undefined, ...(convSummary ? { convSummary } : {}) } : {}),
        }),
      })
      if (!res.ok) {
        let errMsg = 'Sorry, something went wrong. Please try again.'
        if (res.status === 401) errMsg = 'Please sign in to continue chatting.'
        else if (res.status === 402) errMsg = '⚡ You’re out of tokens. Visit the shop to get more and keep chatting!'
        else { try { const b = await res.json(); if (b?.error) errMsg = b.error } catch {} }
        setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: errMsg, isError: true }; return u })
        return
      }
      const remaining = res.headers.get('X-Tokens-Remaining')
      if (remaining !== null) { const n = parseInt(remaining, 10); if (!isNaN(n)) updateTokens(n) }
      if (!res.body) throw new Error('No response body')
      const reader = res.body.getReader(); const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value); fullResponse += chunk
        setMessages(prev => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], content: u[u.length - 1].content + chunk }; return u })
      }
      exchangeOk = fullResponse.length > 0
    } catch {
      setMessages(prev => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], content: 'Sorry, something went wrong. Please try again.', isError: true }; return u })
    } finally {
      setStreaming(false); setTimeout(() => inputRef.current?.focus(), 50)
      if (exchangeOk) {
        const saved = [...prevMessages, userMsg, { role: 'assistant' as const, content: fullResponse }]
        fetch(`/api/conversations/${slug}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: saved, novel_title: title }) }).catch(() => {})
        if (chatMode === 'character' && characterName.trim()) {
          const totalAfter = saved.length; const threshold = summarizedUpTo + 16
          if (totalAfter >= threshold && totalAfter > 16) {
            const toSummarise = saved.slice(0, totalAfter - 8); setSummarizedUpTo(totalAfter)
            fetch('/api/summarize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: toSummarise.map(m => ({ role: m.role, content: m.content })), characterName: characterName.trim(), novelTitle: title }) })
              .then(r => r.ok ? r.json() : null).then((d: { summary?: string } | null) => { if (d?.summary) setConvSummary(d.summary) }).catch(() => {})
          }
        }
      }
    }
  }

  function send() {
    const text = input.trim()
    if (!text || streaming) return
    if (chatMode === 'book' && text.length < 10) return
    if (chatMode === 'character' && !characterName.trim()) return
    if (embedState === 'ready') { setInput(''); sendText(text); return }
    pendingTextRef.current = text; setInput('')
    if (embedState === 'not_embedded' || embedState === 'unknown' || embedState === 'error') startEmbed()
  }

  useEffect(() => {
    if (embedState === 'ready' && pendingTextRef.current) { const t = pendingTextRef.current; pendingTextRef.current = null; sendText(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedState])

  function onKeyDown(e: React.KeyboardEvent) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  // ── Gates ───────────────────────────────────────────────────────────────────
  if (embedState === 'unknown' || embedState === 'checking')
    return <div className="flex flex-1 items-center justify-center"><div className="animate-pulse text-sm text-white/40">Checking novel status…</div></div>

  if (embedState === 'embedding')
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
        <div className="relative">
          <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
            <circle cx="40" cy="40" r="34" fill="none" stroke={ACCENT} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - embedPct / 100)}`} className="transition-all duration-700" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center"><span className="text-lg font-bold" style={{ color: ACCENT }}>{Math.round(embedPct)}%</span></div>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Processing chapters…</h2>
          {embedEta && <p className="mt-1 text-xs text-white/40">{embedEta}</p>}
          {!embedEta && embedPct === 0 && <p className="mt-1 text-xs text-white/40">Starting up…</p>}
        </div>
        <p className="max-w-xs text-xs text-white/40">Hang tight — we&apos;re reading every chapter so you can ask anything about this novel.</p>
      </div>
    )

  if (embedState === 'error')
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-red-400">Something went wrong while processing this novel.</p>
        <button onClick={checkEmbed} className="rounded-lg border border-white/15 px-4 py-2 text-xs transition hover:border-[rgba(var(--v),0.5)]" style={{ color: ACCENT }}>Try Again</button>
      </div>
    )

  // ── Chat UI ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Mode toggle */}
      <div className="shrink-0 border-b border-white/10 px-3 py-2.5">
        <div className="mx-auto flex w-full max-w-2xl gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
          {([['book', '📖 Ask the Book'], ['character', '🎭 Character Chat']] as const).map(([m, label]) => (
            <button key={m} onClick={() => switchMode(m as ChatMode)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${chatMode === m ? 'text-white' : 'text-white/55 hover:text-white'}`}
              style={chatMode === m ? { background: ACCENT } : {}}>{label}</button>
          ))}
        </div>

        {/* Spoiler ceiling */}
        <div className="mx-auto mt-2 max-w-2xl">
          <button onClick={() => setSpoilerOpen(v => !v)} className="flex items-center gap-1.5 text-xs transition" style={{ color: maxChapter ? ACCENT : 'rgba(255,255,255,0.55)' }}>
            <span>{maxChapter ? '🛡' : '🔓'}</span>
            <span className="font-medium">{maxChapter ? `Spoiler shield: ch. 1–${maxChapter}` : 'Spoiler shield off'}</span>
            <svg className={`h-3 w-3 transition ${spoilerOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </button>
          {spoilerOpen && (
            <div className="mt-1.5 flex items-center gap-2 pl-5">
              <label className="text-xs text-white/55">I&apos;ve read up to chapter</label>
              <input type="number" min={1} value={maxChapter ?? ''} onChange={e => { const v = parseInt(e.target.value, 10); setMaxChapter(v > 0 ? v : null) }} placeholder="all"
                className="w-20 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white outline-none focus:border-[rgba(var(--v),0.6)]" />
              {maxChapter && <button onClick={() => { setMaxChapter(null); setSpoilerOpen(false) }} className="text-xs text-white/40 hover:text-white">Clear</button>}
            </div>
          )}
        </div>

        {/* Character picker */}
        {chatMode === 'character' && (
          <div className="mx-auto mt-2 max-w-2xl space-y-2.5">
            {characterName ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full border border-[rgba(var(--v),0.4)] bg-[rgba(var(--v),0.12)] px-3 py-1">
                  {characterProfile?.featured && <span className="text-[10px]" style={{ color: ACCENT }}>✦</span>}
                  <span className="text-xs font-semibold" style={{ color: ACCENT }}>{characterName}</span>
                </div>
                <button onClick={clearCharacter} className="text-xs text-white/40 hover:text-white">Change</button>
              </div>
            ) : (
              <>
                {charLoading && <div className="flex gap-1.5">{[1, 2, 3].map(i => <div key={i} className="h-6 w-20 animate-pulse rounded-full bg-white/10" />)}</div>}
                {!charLoading && featuredChars.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>✦ Curated Characters</p>
                    <div className="flex flex-wrap gap-1.5">
                      {featuredChars.map(c => (
                        <button key={c.name} onClick={() => selectCharacter(c)}
                          className="flex items-center gap-1 rounded-full border border-[rgba(var(--v),0.4)] bg-[rgba(var(--v),0.12)] px-2.5 py-0.5 text-xs font-medium transition hover:brightness-110" style={{ color: ACCENT }}>
                          <span>✦</span>{c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {!charLoading && featuredChars.length === 0 && (
                  <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-center">
                    <p className="text-xs text-white/55">No curated characters for this novel yet.</p>
                  </div>
                )}
              </>
            )}
            {characterName && (
              <p className="text-[10px] text-white/40">Talking to <span style={{ color: ACCENT }}>{characterName}</span> · 10 tokens per message
                {convSummary && <span className="ml-1.5 text-white/40" title="Character remembers earlier messages">· 🧠 memory active</span>}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="text-5xl opacity-70">{chatMode === 'character' ? '🎭' : '✨'}</div>
            <p className="text-base text-white/80">
              {chatMode === 'character' && characterName ? <>You&apos;re now talking to <span className="font-semibold" style={{ color: ACCENT }}>{characterName}</span></>
                : chatMode === 'character' ? 'Pick a character above to start roleplaying'
                : <>Ask anything about <span className="font-semibold" style={{ color: ACCENT }}>{title}</span></>}
            </p>
            {chatMode === 'book' && (
              <div className="mt-1 flex w-full max-w-lg flex-col gap-3">
                {['Explain this novel to me like I just picked it up', 'What makes the MC different from other protagonists?', 'What are the biggest plot twists without spoiling the ending?'].map(q => (
                  <button key={q} onClick={() => { setInput(q); inputRef.current?.focus() }}
                    className="rounded-xl border border-[rgba(var(--v),0.3)] bg-[rgba(var(--v),0.06)] px-5 py-3.5 text-left text-sm font-medium transition hover:brightness-110" style={{ color: 'rgba(255,255,255,0.85)' }}>✦ {q}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl border px-4 py-3 text-[15px] leading-relaxed ${msg.role === 'user' ? 'rounded-br-sm border-white/15' : msg.isError ? 'rounded-bl-sm border-red-500/30' : 'rounded-bl-sm border-[rgba(var(--v),0.3)]'}`}
              style={msg.role === 'user' ? { background: 'rgba(255,255,255,0.06)', color: '#fff' } : msg.isError ? { background: 'rgba(255,255,255,0.04)', color: '#f87171' } : { background: 'rgba(var(--v),0.12)', color: '#fff' }}>
              {msg.content}
              {msg.role === 'assistant' && msg.content === '' && <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-white/50" />}
              {msg.isError && msg.content.includes('shop') && <a href="/shop" className="mt-2 block text-xs font-semibold underline underline-offset-2" style={{ color: ACCENT }}>Go to Shop →</a>}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-white/10 bg-black/20 p-3">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown}
            placeholder={chatMode === 'character' ? 'Say something in character…' : 'Ask about the story, characters, cultivation system…'} rows={1}
            className="max-h-40 flex-1 resize-none overflow-y-auto rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 text-base text-white placeholder-white/35 outline-none transition focus:border-[rgba(var(--v),0.6)]"
            style={{ fieldSizing: 'content' } as React.CSSProperties} disabled={streaming} />
          <button onClick={send} disabled={streaming || !input.trim() || (chatMode === 'book' && input.trim().length < 10) || (chatMode === 'character' && !characterName.trim())}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white transition hover:brightness-110 disabled:opacity-40" style={{ background: ACCENT }}>
            {streaming ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              : <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>}
          </button>
        </div>
        <p className="mt-1.5 text-center text-xs text-white/40">
          {chatMode === 'book' && input.trim().length > 0 && input.trim().length < 10
            ? <span style={{ color: ACCENT }}>{10 - input.trim().length} more character{10 - input.trim().length !== 1 ? 's' : ''} needed</span>
            : chatMode === 'character' && characterName ? <span>10 tokens · talking to <span style={{ color: ACCENT }}>{characterName}</span></span>
            : <span>10 tokens per message<span className="hidden sm:inline"> · Enter to send · Shift+Enter for new line</span></span>}
        </p>
      </div>
    </div>
  )
}
