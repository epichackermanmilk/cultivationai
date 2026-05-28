'use client'

import { useState } from 'react'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { useAuth } from '@/lib/auth-context'

// ── Pricing data ──────────────────────────────────────────────────────────────
const ONE_TIME = [
  { label: 'Spark',   base: 100,  bonus: 0,     total: 100,    price: '$1.00',  priceNum: 1,     highlight: false, badge: null },
  { label: 'Story',   base: 499,  bonus: 51,    total: 550,    price: '$4.99',  priceNum: 4.99,  highlight: false, badge: null },
  { label: 'Novel',   base: 999,  bonus: 201,   total: 1200,   price: '$9.99',  priceNum: 9.99,  highlight: true,  badge: 'Best value' },
  { label: 'Library', base: 2499, bonus: 1001,  total: 3500,   price: '$24.99', priceNum: 24.99, highlight: false, badge: null },
  { label: 'Saga',    base: 4999, bonus: 4251,  total: 9250,   price: '$49.99', priceNum: 49.99, highlight: false, badge: 'Power reader' },
  { label: 'Titan',   base: 9999, bonus: 10001, total: 20000,  price: '$99.99', priceNum: 99.99, highlight: false, badge: 'Best deal' },
]

const SUBS = [
  {
    label: 'Reader',
    price: '$4.99/mo',
    tokens: 700,
    vsBundle: 550,
    savingPct: 27,
    highlight: false,
    perks: ['700 tokens / month', 'Multi-novel chat unlocked', 'Cancel anytime'],
    badge: null,
  },
  {
    label: 'Scholar',
    price: '$9.99/mo',
    tokens: 1600,
    vsBundle: 1200,
    savingPct: 33,
    highlight: true,
    perks: ['1,600 tokens / month', 'Multi-novel chat unlocked', 'Early access to new features', 'Priority support', 'Cancel anytime'],
    badge: 'Best sub',
  },
]

const FAQ = [
  { q: 'What are tokens?', a: 'Tokens are the in-app currency for every AI feature. Each feature has a fixed price: asking a question in regular novel chat costs 10 tokens, using the Recommender costs 10 tokens, and unlocking a novel for AI chat costs 50 tokens. Multi-novel chat costs more due to the complexity. We keep prices fixed so you always know exactly what you\'re spending — no surprise per-word billing. Because conversations go back and forth, features like character chat may be priced lower in the future to encourage more natural exchanges.' },
  { q: 'Do tokens expire?', a: 'No. Tokens you purchase never expire and carry over indefinitely.' },
  { q: 'Can I get a refund?', a: 'We offer refunds within 7 days of purchase if you have not used any tokens from that purchase. Contact us at hello@novelcodex.ai.' },
  { q: 'How do subscriptions work?', a: 'Subscriptions bill monthly and deposit tokens into your account on each renewal cycle. You can cancel anytime from your Stripe billing portal.' },
]

const G: React.CSSProperties = {
  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  )
}

async function startCheckout(
  tier: string,
  mode: string,
  setLoading: (v: string | null) => void,
  setError: (v: string | null) => void,
) {
  setLoading(`${mode}-${tier}`)
  setError(null)
  try {
    const r = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier, mode }),
    })
    const d = await r.json()
    if (!r.ok || !d.url) {
      setError(d.error ?? 'Could not start checkout. Please try again.')
      setLoading(null)
      return
    }
    window.location.href = d.url
  } catch {
    setError('Network error — please try again.')
    setLoading(null)
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ShopPage() {
  const { user } = useAuth()
  const [tab,     setTab]     = useState<'once' | 'sub'>('once')
  const [loading, setLoading] = useState<string | null>(null)
  const [error,   setError]   = useState<string | null>(null)
  const [faqOpen, setFaqOpen] = useState<string | null>(null)

  const handleBuy = (tier: string, mode: string) => {
    if (!user) {
      setError('Please sign in to purchase tokens.')
      return
    }
    startCheckout(tier, mode, setLoading, setError)
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-[var(--nc-border)] bg-[var(--nc-bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="group">
            <span className="block text-xl font-bold tracking-tight" style={G}>NovelCodex</span>
          </Link>
          <div className="flex items-center gap-3">
            {user && (
              <span className="flex items-center gap-1 text-sm font-medium text-amber-400">
                <BoltIcon className="h-3.5 w-3.5" />
                {user.tokens?.toLocaleString() ?? 0}
              </span>
            )}
            <Link href="/library" className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-amber-500/50 hover:text-amber-400 transition">
              {user ? 'Library' : 'Sign in'}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5">
            <BoltIcon className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400">Token Shop</span>
          </div>
          <h1 className="mb-3 text-3xl font-bold tracking-tight" style={{ color: 'var(--nc-text)' }}>
            Get more conversations
          </h1>
          <p className="mx-auto max-w-md text-sm" style={{ color: 'var(--nc-text2)' }}>
            Tokens never expire. 1 message ≈ 10 tokens. Buy once, use any time across every novel.
          </p>
        </div>

        {/* ── Error banner ─────────────────────────────────────────────────── */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-400">
            {error}
            {!user && (
              <Link href="/library" className="ml-2 underline hover:text-red-300">Sign in</Link>
            )}
          </div>
        )}

        {/* ── Tab switcher ─────────────────────────────────────────────────── */}
        <div className="mb-8 flex rounded-xl border border-zinc-700 overflow-hidden text-sm font-medium max-w-xs mx-auto">
          <button
            onClick={() => setTab('once')}
            className={`flex-1 py-2.5 transition ${tab === 'once' ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            One-time
          </button>
          <button
            onClick={() => setTab('sub')}
            className={`flex-1 py-2.5 transition ${tab === 'sub' ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Subscription
          </button>
        </div>

        {/* ── ONE-TIME tiers ───────────────────────────────────────────────── */}
        {tab === 'once' && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-12">
            {ONE_TIME.map(t => {
              const key = `once-${t.label}`
              const isLoading = loading === key
              return (
                <div
                  key={t.label}
                  className={`relative rounded-xl border p-4 flex flex-col transition ${
                    t.highlight ? 'border-amber-500 bg-amber-500/10' : 'border-[var(--nc-border)]'
                  }`}
                  style={t.highlight ? {} : { background: 'var(--nc-bg2)' }}
                >
                  {t.badge && (
                    <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${
                      t.highlight ? 'bg-amber-500 text-black' : 'bg-zinc-700 text-zinc-300'
                    }`}>
                      {t.badge}
                    </span>
                  )}

                  <p className="text-sm font-bold mb-1" style={{ color: 'var(--nc-text)' }}>{t.label}</p>
                  <p className="text-xs mb-0.5" style={{ color: 'var(--nc-text2)' }}>
                    {t.base.toLocaleString()} tokens
                  </p>
                  <p className={`text-xs font-semibold mb-3 ${t.bonus > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                    {t.bonus > 0 ? `+${t.bonus.toLocaleString()} bonus` : 'Base rate'}
                  </p>

                  <div className="mt-auto mb-3">
                    <p className="text-base font-bold text-amber-400 leading-none">
                      {t.total.toLocaleString()}
                      <span className="text-xs font-normal ml-1" style={{ color: 'var(--nc-text2)' }}>total</span>
                    </p>
                    <p className="text-xl font-bold mt-1" style={{ color: 'var(--nc-text)' }}>{t.price}</p>
                  </div>

                  <button
                    onClick={() => handleBuy(t.label, 'once')}
                    disabled={!!loading}
                    className={`w-full rounded-lg py-2 text-xs font-semibold transition ${
                      t.highlight
                        ? 'bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-50'
                        : 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600 disabled:opacity-50'
                    } disabled:cursor-not-allowed`}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                        Redirecting…
                      </span>
                    ) : 'Buy Now'}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* ── SUBSCRIPTION tiers ───────────────────────────────────────────── */}
        {tab === 'sub' && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 max-w-2xl mx-auto mb-12">
            {SUBS.map(s => {
              const key = `sub-${s.label}`
              const isLoading = loading === key
              return (
                <div
                  key={s.label}
                  className={`relative rounded-xl border p-6 flex flex-col transition ${
                    s.highlight ? 'border-amber-500 bg-amber-500/10' : 'border-[var(--nc-border)]'
                  }`}
                  style={s.highlight ? {} : { background: 'var(--nc-bg2)' }}
                >
                  {s.badge && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 text-black px-2.5 py-0.5 text-xs font-bold whitespace-nowrap">
                      {s.badge}
                    </span>
                  )}

                  <p className="text-base font-bold mb-1" style={{ color: 'var(--nc-text)' }}>{s.label}</p>
                  <p className="text-2xl font-bold text-amber-400 mb-1">{s.price}</p>
                  <p className="text-xs font-semibold text-emerald-400 mb-4">
                    {s.tokens.toLocaleString()} tokens/mo
                    <span className="font-normal ml-1" style={{ color: 'var(--nc-text2)' }}>
                      (vs {s.vsBundle.toLocaleString()} one-time — {s.savingPct}% more)
                    </span>
                  </p>

                  <ul className="space-y-2 mb-6">
                    {s.perks.map(p => (
                      <li key={p} className="flex items-start gap-2 text-xs" style={{ color: 'var(--nc-text2)' }}>
                        <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                        {p}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleBuy(s.label, 'sub')}
                    disabled={!!loading}
                    className={`mt-auto w-full rounded-xl py-2.5 text-sm font-semibold transition ${
                      s.highlight
                        ? 'bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-50'
                        : 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600 disabled:opacity-50'
                    } disabled:cursor-not-allowed`}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border border-current border-t-transparent" />
                        Redirecting…
                      </span>
                    ) : 'Subscribe'}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Saved payment methods placeholder ────────────────────────────── */}
        {user && (
          <div
            className="mb-12 rounded-2xl border p-6"
            style={{ borderColor: 'var(--nc-border)', background: 'var(--nc-bg2)' }}
          >
            <h2 className="mb-1 text-base font-bold" style={{ color: 'var(--nc-text)' }}>
              Saved payment methods
            </h2>
            <p className="mb-4 text-xs" style={{ color: 'var(--nc-text2)' }}>
              Your payment details are encrypted and stored securely with Stripe. After your first purchase you can manage billing and saved cards through the Stripe portal.
            </p>
            <div className="flex items-center justify-center rounded-xl border border-dashed py-8" style={{ borderColor: 'var(--nc-border)' }}>
              <p className="text-sm" style={{ color: 'var(--nc-text2)' }}>
                No saved payment methods yet — they will appear here after your first purchase.
              </p>
            </div>
          </div>
        )}

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <div className="mb-12">
          <h2 className="mb-6 text-xl font-bold text-center" style={{ color: 'var(--nc-text)' }}>
            Frequently asked questions
          </h2>
          <div className="mx-auto max-w-2xl space-y-0">
            {FAQ.map(item => (
              <div key={item.q} className="border-t" style={{ borderColor: 'var(--nc-border)' }}>
                <button
                  onClick={() => setFaqOpen(open => open === item.q ? null : item.q)}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium transition hover:text-amber-400"
                  style={{ color: 'var(--nc-text)' }}
                >
                  {item.q}
                  <svg className={`h-3 w-3 shrink-0 transition-transform duration-200 ${faqOpen === item.q ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 10 6">
                    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <div className="grid transition-all duration-200 ease-out"
                  style={{ gridTemplateRows: faqOpen === item.q ? '1fr' : '0fr' }}>
                  <div className="overflow-hidden">
                    <div className="pb-4 pr-8 text-sm leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
                      {item.a}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="border-t" style={{ borderColor: 'var(--nc-border)' }} />
          </div>
        </div>

        {/* ── CTA for signed-out visitors ───────────────────────────────────── */}
        {!user && (
          <div className="text-center rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8">
            <h3 className="mb-2 text-lg font-bold" style={{ color: 'var(--nc-text)' }}>
              Ready to start?
            </h3>
            <p className="mb-5 text-sm" style={{ color: 'var(--nc-text2)' }}>
              Create a free account and get 100 welcome tokens to explore NovelCodex.
            </p>
            <Link
              href="/library"
              className="inline-block rounded-full px-8 py-3 text-sm font-bold text-black transition-all hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
                boxShadow: '0 8px 24px rgba(245,158,11,0.25)',
              }}
            >
              Get started free
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
