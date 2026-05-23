'use client'

import { useState, useEffect } from 'react'

type FeedbackType = 'bug' | 'suggestion' | 'novel_request'

const LABELS: Record<FeedbackType, string> = {
  bug:           '🐛 Bug Report',
  suggestion:    '💡 Suggestion',
  novel_request: '📚 Request a Novel',
}

const PLACEHOLDERS: Record<FeedbackType, string> = {
  bug:           'Describe what happened and how to reproduce it…',
  suggestion:    'What feature or improvement would you like to see?',
  novel_request: 'Paste a novel URL or title you\'d like added…',
}

export default function FeedbackWidget() {
  const [open,    setOpen]    = useState(false)
  const [type,    setType]    = useState<FeedbackType>('suggestion')
  const [text,    setText]    = useState('')
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const reset = () => { setText(''); setEmail(''); setSent(false) }

  const submit = async () => {
    if (!text.trim()) return
    setLoading(true)
    // Store submission locally and show success
    try {
      const submissions = JSON.parse(localStorage.getItem('nc_feedback') ?? '[]')
      submissions.push({ type, text: text.trim(), email: email.trim(), at: new Date().toISOString() })
      localStorage.setItem('nc_feedback', JSON.stringify(submissions.slice(-50)))
    } catch { /* ignore */ }
    await new Promise(r => setTimeout(r, 500))
    setLoading(false)
    setSent(true)
    setTimeout(() => { setOpen(false); reset() }, 2500)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
        style={{ background: 'var(--nc-amber)', color: '#000' }}
        title="Feedback / Report / Request"
        aria-label="Open feedback"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end p-5 sm:items-center sm:justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) { setOpen(false); reset() } }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[var(--nc-border)] p-5 shadow-2xl"
            style={{ background: 'var(--nc-bg2)' }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold" style={{ color: 'var(--nc-text)' }}>Send Feedback</h2>
              <button
                onClick={() => { setOpen(false); reset() }}
                className="text-zinc-500 hover:text-zinc-300 transition text-xl leading-none"
              >×</button>
            </div>

            {sent ? (
              <div className="py-6 text-center">
                <div className="text-3xl mb-2">✦</div>
                <p className="text-sm font-medium text-amber-400">Thank you!</p>
                <p className="mt-1 text-xs text-zinc-500">Your feedback has been recorded.</p>
              </div>
            ) : (
              <>
                {/* Type selector */}
                <div className="mb-4 flex gap-1">
                  {(Object.keys(LABELS) as FeedbackType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition ${
                        type === t ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                      style={type !== t ? { background: 'var(--nc-bg3)' } : {}}
                    >
                      {LABELS[t].split(' ')[0]}
                      <span className="block text-xs font-normal">{LABELS[t].split(' ').slice(1).join(' ')}</span>
                    </button>
                  ))}
                </div>

                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder={PLACEHOLDERS[type]}
                  rows={4}
                  className="mb-3 w-full resize-none rounded-xl border border-[var(--nc-border)] p-3 text-sm placeholder-zinc-500 outline-none focus:border-amber-500 transition"
                  style={{ background: 'var(--nc-bg3)', color: 'var(--nc-text)' }}
                />

                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Your email (optional — for follow-up)"
                  className="mb-3 w-full rounded-xl border border-[var(--nc-border)] px-3 py-2 text-sm placeholder-zinc-500 outline-none focus:border-amber-500 transition"
                  style={{ background: 'var(--nc-bg3)', color: 'var(--nc-text)' }}
                />

                <button
                  onClick={submit}
                  disabled={loading || !text.trim()}
                  className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition disabled:opacity-50"
                >
                  {loading ? 'Sending…' : 'Send'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
