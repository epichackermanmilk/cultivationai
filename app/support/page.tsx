'use client'

import { useState } from 'react'
import Link from 'next/link'

const CATEGORIES = [
  'Bug report',
  'Feature request',
  'Account / billing',
  'Novel request',
  'Other',
]

export default function SupportPage() {
  const [category, setCategory] = useState(CATEGORIES[0])
  const [subject,  setSubject]  = useState('')
  const [message,  setMessage]  = useState('')
  const [email,    setEmail]    = useState('')
  const [sent,     setSent]     = useState(false)
  const [sending,  setSending]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !subject.trim() || !message.trim()) {
      setError('Please fill in all fields.'); return
    }
    setSending(true); setError(null)
    try {
      const r = await fetch('/api/support', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), category, subject: subject.trim(), message: message.trim() }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        setError((d as { error?: string }).error ?? 'Failed to send. Please try again.')
        return
      }
      setSent(true)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setSending(false)
    }
  }

  const inputCls = 'w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30'
  const inputStyle = { background: 'var(--nc-bg)', borderColor: 'var(--nc-border)', color: 'var(--nc-text)' }

  return (
    <div className="mx-auto max-w-lg px-4 py-12" style={{ color: 'var(--nc-text)' }}>
      {/* Back */}
      <Link
        href="/library"
        className="mb-6 inline-flex items-center gap-1.5 text-xs transition hover:text-amber-400"
        style={{ color: 'var(--nc-text2)' }}
      >
        ← Back to library
      </Link>

      <h1 className="mb-1 text-2xl font-bold text-amber-400">Support</h1>
      <p className="mb-8 text-sm" style={{ color: 'var(--nc-text2)' }}>
        Found a bug? Want a feature? Need help? Send us a message and we'll get back to you.
      </p>

      {sent ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h2 className="mb-2 text-lg font-bold text-emerald-400">Message sent!</h2>
          <p className="text-sm mb-5" style={{ color: 'var(--nc-text2)' }}>
            We'll get back to you at <strong>{email}</strong> as soon as possible.
          </p>
          <Link
            href="/library"
            className="inline-block rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition"
          >
            Back to library
          </Link>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border p-6 space-y-4"
          style={{ borderColor: 'var(--nc-border)', background: 'var(--nc-bg2)' }}
        >
          {/* Category */}
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--nc-text)' }}>
              Category
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className={inputCls}
              style={inputStyle}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Email */}
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--nc-text)' }}>
              Your email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputCls}
              style={inputStyle}
            />
          </div>

          {/* Subject */}
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--nc-text)' }}>
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Brief description"
              maxLength={120}
              className={inputCls}
              style={inputStyle}
            />
          </div>

          {/* Message */}
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--nc-text)' }}>
              Message
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Describe the bug, feature, or question in as much detail as you can…"
              rows={5}
              maxLength={2000}
              className={`${inputCls} resize-none`}
              style={inputStyle}
            />
            <p className="mt-1 text-right text-xs" style={{ color: 'var(--nc-text2)' }}>
              {message.length}/2000
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {sending ? 'Sending…' : 'Send Message'}
          </button>

          <p className="text-center text-xs" style={{ color: 'var(--nc-text2)' }}>
            We typically respond within 24–48 hours.
          </p>
        </form>
      )}
    </div>
  )
}
