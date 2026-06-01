'use client'

import { useState } from 'react'
import Link        from 'next/link'
import SiteHeader from '@/components/SiteHeader'
import Footer      from '@/components/Footer'

const CATEGORIES = [
  { id: 'Bug report',       icon: '🐛', desc: 'Something is broken or behaving unexpectedly' },
  { id: 'Feature request',  icon: '✨', desc: 'Suggest a new feature or improvement' },
  { id: 'Account / billing',icon: '💳', desc: 'Tokens, subscriptions, or account access' },
  { id: 'Novel request',    icon: '📚', desc: 'Ask us to add a specific novel to the library' },
  { id: 'Other',            icon: '💬', desc: 'Anything else on your mind' },
]

const QUICK_ANSWERS = [
  {
    q: 'How do I start chatting with a novel?',
    a: 'Just pick any novel and start asking — every novel in the library is ready to use. You only spend tokens (10 per message) when you actually chat.',
  },
  {
    q: 'Where can I get more tokens?',
    a: 'Visit the Shop from the token widget in the top-right corner. Packs start from $2.',
  },
  {
    q: 'Can you add [novel name]?',
    a: 'We automatically scrape thousands of titles and add more weekly. Use the Novel Request category below if you want a specific title prioritised.',
  },
  {
    q: 'I found a factual error in a chat response.',
    a: 'AI responses are grounded in actual chapter text but can occasionally misread context. Use the Bug Report category below with the novel name and question.',
  },
]

export default function SupportPage() {
  const [category, setCategory] = useState(CATEGORIES[0].id)
  const [subject,  setSubject]  = useState('')
  const [message,  setMessage]  = useState('')
  const [email,    setEmail]    = useState('')
  const [sent,     setSent]     = useState(false)
  const [sending,  setSending]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [faqOpen,  setFaqOpen]  = useState<number | null>(null)

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

  const inputCls   = 'w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 placeholder-zinc-500'
  const inputStyle = { background: 'var(--nc-bg)', borderColor: 'var(--nc-border)', color: 'var(--nc-text)' }

  return (
    <div className="min-h-screen flex flex-col pb-16 sm:pb-0" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>

      <SiteHeader />

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-10">

        {/* Hero */}
        <div className="mb-10">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-500/70">Help &amp; Support</p>
          <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--nc-text)' }}>How can we help?</h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--nc-text2)' }}>
            We typically respond within 24–48 hours. For urgent account issues, include your email in the message.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">

          {/* Left — FAQ + success state */}
          <div>
            {/* Quick answers */}
            <div className="mb-8 rounded-2xl border border-[var(--nc-border)] overflow-hidden"
              style={{ background: 'var(--nc-bg2)' }}>
              <div className="border-b border-[var(--nc-border)] px-5 py-4">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--nc-text)' }}>Quick answers</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--nc-text2)' }}>Check these before submitting — you might find your answer instantly.</p>
              </div>
              {QUICK_ANSWERS.map((item, i) => (
                <div key={i} className="border-b border-[var(--nc-border)] last:border-0">
                  <button
                    type="button"
                    onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium transition hover:bg-zinc-800/30"
                    style={{ color: 'var(--nc-text)' }}
                  >
                    {item.q}
                    <svg viewBox="0 0 10 6" fill="none" className="h-3 w-3 shrink-0 transition-transform duration-200"
                      style={{ transform: faqOpen === i ? 'rotate(180deg)' : 'none', color: 'var(--nc-text2)' }}>
                      <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <div className="grid transition-all duration-200"
                    style={{ gridTemplateRows: faqOpen === i ? '1fr' : '0fr' }}>
                    <div className="overflow-hidden">
                      <p className="px-5 pb-4 text-sm leading-relaxed" style={{ color: 'var(--nc-text2)' }}>{item.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Contact info */}
            <div className="rounded-2xl border border-[var(--nc-border)] p-5"
              style={{ background: 'var(--nc-bg2)' }}>
              <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--nc-text)' }}>Direct contact</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">📧</span>
                  <a href="mailto:hello@novelcodex.org" className="text-amber-400 hover:text-amber-300 transition">
                    hello@novelcodex.org
                  </a>
                  <span className="text-xs" style={{ color: 'var(--nc-text2)' }}>— General</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-base">⚖️</span>
                  <a href="mailto:dmca@novelcodex.org" className="text-amber-400 hover:text-amber-300 transition">
                    dmca@novelcodex.org
                  </a>
                  <span className="text-xs" style={{ color: 'var(--nc-text2)' }}>— DMCA / Content removal</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🔒</span>
                  <a href="mailto:privacy@novelcodex.org" className="text-amber-400 hover:text-amber-300 transition">
                    privacy@novelcodex.org
                  </a>
                  <span className="text-xs" style={{ color: 'var(--nc-text2)' }}>— Privacy / CCPA requests</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Contact form */}
          <div>
            {sent ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
                <div className="mb-4 flex h-16 w-16 mx-auto items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
                  <span className="text-2xl">✅</span>
                </div>
                <h2 className="mb-2 text-lg font-bold text-emerald-400">Message sent!</h2>
                <p className="text-sm mb-6" style={{ color: 'var(--nc-text2)' }}>
                  We'll get back to you at <strong className="text-emerald-300">{email}</strong> within 24–48 hours.
                </p>
                <Link
                  href="/library"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition"
                >
                  ← Back to library
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="rounded-2xl border border-[var(--nc-border)] overflow-hidden"
                style={{ background: 'var(--nc-bg2)' }}>
                <div className="border-b border-[var(--nc-border)] px-5 py-4">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--nc-text)' }}>Send a message</h3>
                </div>
                <div className="p-5 space-y-4">

                  {/* Category buttons */}
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--nc-text2)' }}>
                      Category
                    </label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                            category === cat.id
                              ? 'border-amber-500/60 bg-amber-500/10 text-amber-300'
                              : 'border-[var(--nc-border)] hover:border-amber-500/30'
                          }`}
                          style={category !== cat.id ? { color: 'var(--nc-text2)' } : {}}
                        >
                          <span className="text-base shrink-0">{cat.icon}</span>
                          <div>
                            <span className="font-semibold">{cat.id}</span>
                            <span className="ml-1.5 opacity-60">{cat.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--nc-text2)' }}>
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
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--nc-text2)' }}>
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
                    <p className="mt-1 text-right text-xs text-zinc-600">{subject.length}/120</p>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--nc-text2)' }}>
                      Message
                    </label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Describe your issue in as much detail as possible — include the novel name if relevant…"
                      rows={5}
                      maxLength={2000}
                      className={`${inputCls} resize-none`}
                      style={inputStyle}
                    />
                    <p className="mt-1 text-right text-xs text-zinc-600">{message.length}/2000</p>
                  </div>

                  {error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full rounded-xl py-3 text-sm font-bold text-black transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
                    style={{ background: 'linear-gradient(135deg,#fbbf24 0%,#f59e0b 50%,#d97706 100%)', boxShadow: '0 6px 20px rgba(245,158,11,0.25)' }}
                  >
                    {sending ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                        Sending…
                      </span>
                    ) : 'Send Message →'}
                  </button>

                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
