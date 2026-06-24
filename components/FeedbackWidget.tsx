'use client'

// Floating, draggable feedback bubble (global). Sends real submissions to /api/support
// (email via Resend) — bug reports, suggestions, novel/character requests. Themed to
// the dark/purple redesign. Hidden inside the full-screen reader to avoid covering text.

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { track } from '@/lib/analytics'

type FeedbackType = 'bug' | 'suggestion' | 'novel_request' | 'character_request'

const LABELS: Record<FeedbackType, string> = {
  bug:               '🐛 Bug',
  suggestion:        '💡 Idea',
  novel_request:     '📚 Novel',
  character_request: '🎭 Character',
}
const CATEGORY: Record<FeedbackType, string> = {
  bug: 'Bug report', suggestion: 'Feature request', novel_request: 'Novel request', character_request: 'Character request',
}
const PLACEHOLDERS: Record<FeedbackType, string> = {
  bug:               'Describe what happened and how to reproduce it…',
  suggestion:        'What feature or improvement would you like to see?',
  novel_request:     'Paste a novel URL or title you\'d like added…',
  character_request: 'Which character and from which novel? e.g. "Linley from Coiling Dragon"',
}

export default function FeedbackWidget() {
  const pathname = usePathname()
  const [open,    setOpen]    = useState(false)
  const [type,    setType]    = useState<FeedbackType>('suggestion')
  const [text,    setText]    = useState('')
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [err,     setErr]     = useState<string | null>(null)

  const [pos,     setPos]     = useState<{ x: number; y: number } | null>(null)
  const dragging  = useRef(false)
  const dragStart = useRef({ mx: 0, my: 0, bx: 0, by: 0 })
  const btnRef    = useRef<HTMLButtonElement>(null)

  const beginDrag = useCallback((startX: number, startY: number, isTouch: boolean) => {
    const rect = btnRef.current!.getBoundingClientRect()
    dragging.current  = true
    dragStart.current = { mx: startX, my: startY, bx: rect.left, by: rect.top }
    const move = (cx: number, cy: number) => {
      const dx = cx - dragStart.current.mx
      const dy = cy - dragStart.current.my
      const nx = Math.max(0, Math.min(window.innerWidth  - 48, dragStart.current.bx + dx))
      const ny = Math.max(80, Math.min(window.innerHeight - 48, dragStart.current.by + dy))
      setPos({ x: nx, y: ny })
    }
    const finish = (cx: number, cy: number) => {
      const totalMove = Math.abs(cx - dragStart.current.mx) + Math.abs(cy - dragStart.current.my)
      dragging.current = false
      document.removeEventListener('mousemove', mMove); document.removeEventListener('mouseup', mUp)
      document.removeEventListener('touchmove', tMove); document.removeEventListener('touchend', tEnd)
      if (totalMove < 8) setOpen(true)
    }
    const mMove = (ev: MouseEvent) => { if (dragging.current) move(ev.clientX, ev.clientY) }
    const mUp   = (ev: MouseEvent) => finish(ev.clientX, ev.clientY)
    const tMove = (ev: TouchEvent) => { const t = ev.touches[0]; if (dragging.current && t) { ev.preventDefault(); move(t.clientX, t.clientY) } }
    const tEnd  = (ev: TouchEvent) => { const t = ev.changedTouches[0]; finish(t?.clientX ?? dragStart.current.mx, t?.clientY ?? dragStart.current.my) }
    if (isTouch) { document.addEventListener('touchmove', tMove, { passive: false }); document.addEventListener('touchend', tEnd) }
    else { document.addEventListener('mousemove', mMove); document.addEventListener('mouseup', mUp) }
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => { if (e.button !== 0) return; e.preventDefault(); beginDrag(e.clientX, e.clientY, false) }, [beginDrag])
  const onTouchStart = useCallback((e: React.TouchEvent) => { const t = e.touches[0]; if (t) beginDrag(t.clientX, t.clientY, true) }, [beginDrag])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Don't cover the reading surface.
  if (pathname?.startsWith('/novel/') && pathname.includes('/read/')) return null

  const reset = () => { setText(''); setEmail(''); setSent(false); setErr(null) }
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const submit = async () => {
    if (!text.trim() || !emailValid || loading) return
    setLoading(true); setErr(null)
    try {
      const r = await fetch('/api/support', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), category: CATEGORY[type], subject: `Feedback — ${CATEGORY[type]}`, message: text.trim() }),
      })
      if (!r.ok) { const d = await r.json().catch(() => ({})); setErr((d as { error?: string }).error ?? 'Could not send — try again.'); return }
      setSent(true); track('feedback_sent', { type })
      setTimeout(() => { setOpen(false); reset() }, 2200)
    } catch { setErr('Network error — try again.') } finally { setLoading(false) }
  }

  const bubbleStyle: React.CSSProperties = pos
    ? { position: 'fixed', left: pos.x, top: pos.y, bottom: 'auto', right: 'auto' }
    : {}

  const field = 'w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white placeholder-white/35 outline-none transition focus:border-[rgba(var(--v),0.6)]'

  return (
    <div style={{ ['--v' as string]: '124,58,237' }}>
      <button
        ref={btnRef} onMouseDown={onMouseDown} onTouchStart={onTouchStart}
        className={`z-[60] flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-110 active:scale-95 select-none ${pos ? '' : 'fixed bottom-20 right-4 sm:bottom-5 sm:right-5'}`}
        style={{ ...bubbleStyle, background: 'rgb(var(--v))', boxShadow: '0 6px 24px rgba(124,58,237,0.45)', cursor: 'grab', touchAction: 'none' }}
        title="Feedback · report a bug · request a novel (drag to move)" aria-label="Open feedback"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-end p-4 sm:items-center sm:justify-center"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) { setOpen(false); reset() } }}>
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#120f1e] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black tracking-tight text-white">Send feedback</h2>
              <button onClick={() => { setOpen(false); reset() }} className="text-xl leading-none text-white/40 transition hover:text-white">×</button>
            </div>

            {sent ? (
              <div className="py-8 text-center">
                <div className="mb-2 text-3xl">✦</div>
                <p className="text-sm font-semibold" style={{ color: 'rgb(var(--v))' }}>Thank you!</p>
                <p className="mt-1 text-xs text-white/45">Your message was sent — we&apos;ll follow up by email.</p>
              </div>
            ) : (
              <>
                <div className="mb-3 grid grid-cols-4 gap-1.5">
                  {(Object.keys(LABELS) as FeedbackType[]).map(t => (
                    <button key={t} onClick={() => setType(t)}
                      className={`rounded-lg py-2 text-xs font-semibold transition ${type === t ? 'text-white' : 'text-white/55 hover:text-white'}`}
                      style={{ background: type === t ? 'rgb(var(--v))' : 'rgba(255,255,255,0.05)' }}>
                      {LABELS[t]}
                    </button>
                  ))}
                </div>
                <textarea value={text} onChange={e => setText(e.target.value)} placeholder={PLACEHOLDERS[type]} rows={5} className={`${field} resize-none`} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email (so we can follow up)" className={`${field} mt-2`} />
                {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
                <button onClick={submit} disabled={loading || !text.trim() || !emailValid}
                  className="mt-3 w-full rounded-xl py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                  style={{ background: 'rgb(var(--v))' }}>
                  {loading ? 'Sending…' : 'Send'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
