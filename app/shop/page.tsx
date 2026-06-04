'use client'

import { useState, useEffect } from 'react'
import Link        from 'next/link'
import SiteHeader  from '@/components/SiteHeader'
import Footer      from '@/components/Footer'
import { useAuth } from '@/lib/auth-context'
import { isNativeAppClient } from '@/lib/native'
import WatchAdButton from '@/components/WatchAdButton'

// ── Pricing data ──────────────────────────────────────────────────────────────
const ONE_TIME = [
  { label: 'Story',   base: 499,  bonus: 51,    total: 550,    price: '$4.99',  priceNum: 4.99,  highlight: false, badge: null },
  { label: 'Novel',   base: 999,  bonus: 201,   total: 1200,   price: '$9.99',  priceNum: 9.99,  highlight: true,  badge: 'Best value' },
  { label: 'Library', base: 2499, bonus: 1001,  total: 3500,   price: '$24.99', priceNum: 24.99, highlight: false, badge: null },
  { label: 'Saga',    base: 4999, bonus: 4251,  total: 9250,   price: '$49.99', priceNum: 49.99, highlight: false, badge: 'Power reader' },
  { label: 'Titan',   base: 9999, bonus: 10001, total: 20000,  price: '$99.99', priceNum: 99.99, highlight: false, badge: 'Best deal' },
]

const WELCOME_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

const SUBS = [
  {
    label: 'Reader',
    price: '$4.99/mo',
    tokens: 700,
    vsBundle: 550,
    savingPct: 27,
    highlight: false,
    perks: ['700 tokens / month', 'Multi-novel chat included', 'Ad-free everywhere', 'Discord: custom color role + your own private channel', 'Cancel anytime'],
    badge: null,
  },
  {
    label: 'Scholar',
    price: '$9.99/mo',
    tokens: 1600,
    vsBundle: 1200,
    savingPct: 33,
    highlight: true,
    perks: ['1,600 tokens / month', 'Multi-novel chat included', 'Ad-free everywhere', 'Discord: custom color role + your own private channel', 'Early access to new features', 'Priority support', 'Cancel anytime'],
    badge: 'Best sub',
  },
]

const FAQ = [
  { q: 'What are tokens?', a: 'Tokens are the in-app currency for every AI feature. Each feature has a fixed price: asking a question in regular novel chat costs 10 tokens, and using the Recommender costs 10 tokens. Every novel in the library is ready to chat with for free — you only spend tokens when you actually chat. We keep prices fixed so you always know exactly what you\'re spending — no surprise per-word billing.' },
  { q: 'Do tokens expire?', a: 'No. Tokens you purchase never expire and carry over indefinitely.' },
  { q: 'Can I get a refund?', a: 'We offer refunds within 7 days of purchase if you have not used any tokens from that purchase. Contact us at hello@novelcodex.org.' },
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

// ── Welcome Deal countdown ────────────────────────────────────────────────────
function useCountdown(expiresAt: number) {
  const [remaining, setRemaining] = useState(() => Math.max(0, expiresAt - Date.now()))

  useEffect(() => {
    if (remaining <= 0) return
    const id = setInterval(() => {
      const r = Math.max(0, expiresAt - Date.now())
      setRemaining(r)
    }, 1000)
    return () => clearInterval(id)
  }, [expiresAt, remaining])

  const totalSecs = Math.floor(remaining / 1000)
  const d = Math.floor(totalSecs / 86400)
  const h = Math.floor((totalSecs % 86400) / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  return { d, h, m, s, expired: remaining <= 0 }
}

function WelcomeDeal({
  createdAt,
  loading,
  onBuy,
}: {
  createdAt: string
  loading: string | null
  onBuy: (tier: string, mode: string) => void
}) {
  const expiresAt = new Date(createdAt).getTime() + WELCOME_WINDOW_MS
  const { d, h, m, s, expired } = useCountdown(expiresAt)
  if (expired) return null

  const pad = (n: number) => String(n).padStart(2, '0')
  const isLoading = loading === 'once-Welcome'

  return (
    <div className="mb-10 relative overflow-hidden rounded-2xl border border-amber-500/50 p-6"
      style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(217,119,6,0.08) 100%)' }}>

      {/* Pulse glow */}
      <div className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }} />

      {/* Badge */}
      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-black">
        ⚡ New Member Offer — Limited Time
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h2 className="text-2xl font-extrabold mb-1" style={{ color: 'var(--nc-text)' }}>
            500 tokens for{' '}
            <span style={{ background: 'linear-gradient(135deg,#fbbf24,#d97706)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              $1.00
            </span>
          </h2>
          <p className="text-sm mb-3" style={{ color: 'var(--nc-text2)' }}>
            That&apos;s <span className="font-bold text-amber-400">5× the normal value</span> — our welcome gift to you.
            Enough for 50 chat messages and recommendations.
          </p>

          {/* Value comparison pills */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-zinc-600 px-2.5 py-1 text-zinc-400 line-through">
              Normal: 100 tokens / $1
            </span>
            <span className="rounded-full border border-amber-500/50 bg-amber-500/10 px-2.5 py-1 text-amber-400 font-semibold">
              Deal: 500 tokens / $1 ✦ 500% value
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 shrink-0">
          {/* Countdown */}
          <div className="flex items-center gap-1.5 text-center">
            {[{ v: d, u: 'd' }, { v: h, u: 'h' }, { v: m, u: 'm' }, { v: s, u: 's' }].map(({ v, u }) => (
              <div key={u} className="flex flex-col items-center">
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 min-w-[2.5rem] text-center">
                  <span className="text-lg font-mono font-bold text-amber-400">{pad(v)}</span>
                </div>
                <span className="text-[10px] text-zinc-500 mt-0.5">{u}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-500">Expires after 7 days</p>

          <button
            onClick={() => onBuy('Welcome', 'once')}
            disabled={!!loading}
            className="w-full rounded-xl py-3 px-8 text-sm font-bold text-black transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
            style={{ background: 'linear-gradient(135deg,#fbbf24 0%,#f59e0b 50%,#d97706 100%)', boxShadow: '0 6px 20px rgba(245,158,11,0.35)' }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                Redirecting…
              </span>
            ) : 'Claim Offer — $1.00'}
          </button>
        </div>
      </div>
    </div>
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

  // Native-app detection. Inside the Android app, token purchases are not offered
  // (Google Play requires Play Billing for in-app digital goods) — we hide the
  // purchase UI and show a "manage on the web" notice instead. Gated on `mounted`
  // so the buy buttons are never rendered inside the app, even for one frame.
  const [mounted,  setMounted]  = useState(false)
  const [isNative, setIsNative] = useState(false)
  useEffect(() => { setMounted(true); setIsNative(isNativeAppClient()) }, [])
  const showPurchase = mounted && !isNative

  const handleBuy = (tier: string, mode: string) => {
    if (!user) {
      setError('Please sign in to purchase tokens.')
      return
    }
    startCheckout(tier, mode, setLoading, setError)
  }

  return (
    <div className="min-h-screen pb-16 sm:pb-0" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <SiteHeader />

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

        {/* ── In-app notice: token purchases are web-only (Google Play policy) ── */}
        {mounted && isNative && (
          <div className="mb-10 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5">
              <BoltIcon className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400">Manage tokens on the web</span>
            </div>
            <h2 className="mb-2 text-lg font-bold" style={{ color: 'var(--nc-text)' }}>
              Top-ups happen on novelcodex.org
            </h2>
            <p className="mx-auto max-w-md text-sm" style={{ color: 'var(--nc-text2)' }}>
              Token purchases and subscriptions are handled on the NovelCodex website. Open{' '}
              <span className="font-semibold text-amber-400">novelcodex.org</span> in your browser to add tokens or
              manage your plan — your balance and everything you own stay in sync automatically.
            </p>
            {/* Free in-app way to earn tokens (only renders when AdMob is present) */}
            <div className="mx-auto mt-5 max-w-xs"><WatchAdButton /></div>
          </div>
        )}

        {/* ── Web purchase region (hidden inside the native app) ──────────── */}
        {showPurchase && (<>

        {/* ── Welcome Deal (new members only, 7-day window) ─────────────── */}
        {user && (() => {
          const age = Date.now() - new Date(user.created_at ?? 0).getTime()
          return age < WELCOME_WINDOW_MS
        })() && (
          <WelcomeDeal
            createdAt={user.created_at}
            loading={loading}
            onBuy={handleBuy}
          />
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

        {/* ── Ad-Free add-on ───────────────────────────────────────────────── */}
        <div className="mb-12 rounded-2xl border border-zinc-700 overflow-hidden" style={{ background: 'var(--nc-bg2)' }}>
          <div className="flex items-center justify-between gap-4 p-5 border-b border-zinc-800">
            <div>
              <h2 className="text-sm font-bold mb-0.5" style={{ color: 'var(--nc-text)' }}>
                🚫 Remove Ads Forever
              </h2>
              <p className="text-xs" style={{ color: 'var(--nc-text2)' }}>
                One-time purchase · No subscription needed · Permanent
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold text-amber-400">$4.99</p>
              <p className="text-xs text-zinc-500">one-time</p>
            </div>
          </div>
          <div className="p-5">
            <ul className="grid grid-cols-2 gap-2 mb-4">
              {['No ads on Library', 'No ads on Games', 'Works across all devices', 'Never expires'].map(perk => (
                <li key={perk} className="flex items-center gap-2 text-xs" style={{ color: 'var(--nc-text2)' }}>
                  <span className="text-emerald-400">✓</span>
                  {perk}
                </li>
              ))}
            </ul>
            <p className="text-xs mb-4" style={{ color: 'var(--nc-text2)' }}>
              Active subscribers are already ad-free for the duration of their subscription.
              This purchase makes it permanent.
            </p>
            {user?.ads_disabled ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-center text-sm font-semibold text-emerald-400">
                ✓ You&apos;re already ad-free
              </div>
            ) : (
              <button
                onClick={() => handleBuy('AdFree', 'addon')}
                disabled={!!loading || !user}
                className="w-full rounded-xl border border-zinc-600 bg-zinc-700 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-600 hover:border-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'addon-AdFree' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                    Redirecting…
                  </span>
                ) : user ? 'Remove Ads — $4.99' : 'Sign in to purchase'}
              </button>
            )}
          </div>
        </div>

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

        </>)}
        {/* ── end web purchase region ──────────────────────────────────────── */}

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
              Create a free account and get 50 welcome tokens to explore NovelCodex.
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
