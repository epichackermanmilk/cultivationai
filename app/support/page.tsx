'use client'

import { useState } from 'react'
import Link        from 'next/link'
import DocShell    from '@/components/DocShell'

const CATEGORIES = [
  { id: 'Bug report',       icon: '🐛', desc: 'Something is broken or behaving unexpectedly' },
  { id: 'Feature request',  icon: '✨', desc: 'Suggest a new feature or improvement' },
  { id: 'Account / billing',icon: '💳', desc: 'Tokens, subscriptions, or account access' },
  { id: 'Novel request',    icon: '📚', desc: 'Ask us to add a specific novel to the library' },
  { id: 'Other',            icon: '💬', desc: 'Anything else on your mind' },
]

const QUICK_ANSWERS = [
  {
    q: 'Is reading free?',
    a: 'Yes. Every novel is free to read on-site (ad-supported). The latest ~20% of each novel is reserved for supporters — read those with an active subscription, or unlock individual chapters for 2 tokens each.',
  },
  {
    q: 'How many free tokens do I get?',
    a: 'New accounts start with 40 free tokens, plus 10 more when you add your name and age — 50 total, no credit card required. Tokens are spent on AI chat (10/message), recommendations, unlocking chapters, and EPUB downloads.',
  },
  {
    q: 'Where can I get more tokens or subscribe?',
    a: 'Open the Shop from the token widget in the top-right corner. New members get a 7-day Welcome deal, one-time packs start at $0.99, and subscriptions start at $2.99/mo (ad-free, all locked chapters, free EPUBs, monthly tokens). Tokens never expire.',
  },
  {
    q: 'Why is a chapter locked?',
    a: 'The newest ~20% of every novel is for supporters. Read them with any active subscription, or unlock individual chapters for 2 tokens each. Chapters you unlock with tokens are yours to keep.',
  },
  {
    q: 'Can you add a specific novel?',
    a: 'We index new novels continuously. Use the Novel Request category below to tell us what to add — highly requested titles are prioritised.',
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

  const inputCls   = 'w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-[rgba(var(--v),0.6)] focus:ring-1 focus:ring-[rgba(var(--v),0.3)] placeholder-white/35'
  const inputStyle = { background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }

  return (
    <DocShell title="How can we help?" subtitle="We typically respond within 24–48 hours. For urgent account issues, include your email in the message." maxW="max-w-5xl">
      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">

          {/* Left — FAQ + success state */}
          <div>
            {/* Quick answers */}
            <div className="mb-8 rounded-2xl border border-white/10 overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="border-b border-white/10 px-5 py-4">
                <h3 className="text-sm font-semibold" style={{ color: '#fff' }}>Quick answers</h3>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Check these before submitting — you might find your answer instantly.</p>
              </div>
              {QUICK_ANSWERS.map((item, i) => (
                <div key={i} className="border-b border-white/10 last:border-0">
                  <button
                    type="button"
                    onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium transition hover:bg-white/5"
                    style={{ color: '#fff' }}
                  >
                    {item.q}
                    <svg viewBox="0 0 10 6" fill="none" className="h-3 w-3 shrink-0 transition-transform duration-200"
                      style={{ transform: faqOpen === i ? 'rotate(180deg)' : 'none', color: 'rgba(255,255,255,0.5)' }}>
                      <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <div className="grid transition-all duration-200"
                    style={{ gridTemplateRows: faqOpen === i ? '1fr' : '0fr' }}>
                    <div className="overflow-hidden">
                      <p className="px-5 pb-4 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Contact info */}
            <div className="rounded-2xl border border-white/10 p-5"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              <h3 className="mb-3 text-sm font-semibold" style={{ color: '#fff' }}>Direct contact</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">📧</span>
                  <a href="mailto:hello@novelcodex.org" className="text-[rgb(var(--v))] hover:opacity-80 transition">
                    hello@novelcodex.org
                  </a>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>— General</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-base">⚖️</span>
                  <a href="mailto:dmca@novelcodex.org" className="text-[rgb(var(--v))] hover:opacity-80 transition">
                    dmca@novelcodex.org
                  </a>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>— DMCA / Content removal</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🔒</span>
                  <a href="mailto:privacy@novelcodex.org" className="text-[rgb(var(--v))] hover:opacity-80 transition">
                    privacy@novelcodex.org
                  </a>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>— Privacy / CCPA requests</span>
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
                <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  We&apos;ll get back to you at <strong className="text-emerald-300">{email}</strong> within 24–48 hours.
                </p>
                <Link
                  href="/browse"
                  className="inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                  style={{ background: 'rgb(var(--v))' }}
                >
                  ← Back to browse
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="border-b border-white/10 px-5 py-4">
                  <h3 className="text-sm font-semibold" style={{ color: '#fff' }}>Send a message</h3>
                </div>
                <div className="p-5 space-y-4">

                  {/* Category buttons */}
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
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
                              ? 'border-[rgba(var(--v),0.6)] bg-[rgba(var(--v),0.12)] text-white'
                              : 'border-white/10 hover:border-white/25'
                          }`}
                          style={category !== cat.id ? { color: 'rgba(255,255,255,0.5)' } : {}}
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
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
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
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
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
                    <p className="mt-1 text-right text-xs text-white/30">{subject.length}/120</p>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
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
                    <p className="mt-1 text-right text-xs text-white/30">{message.length}/2000</p>
                  </div>

                  {error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full rounded-xl py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
                    style={{ background: 'rgb(var(--v))', boxShadow: '0 6px 20px rgba(124,58,237,0.35)' }}
                  >
                    {sending ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Sending…
                      </span>
                    ) : 'Send Message →'}
                  </button>

                </div>
              </form>
            )}
          </div>
        </div>
    </DocShell>
  )
}
