'use client'

// /testshop — token shop, redesigned to the /test* standard (dark glass, purple).
// Same backend as /shop: POST /api/checkout (Stripe). Welcome deal, one-time tiers,
// subscriptions, permanent ad-free add-on, FAQ.

import { useState, useEffect } from 'react'
import Link from 'next/link'
import TestHeader from '@/components/TestHeader'
import { TestStyles } from '@/components/TestUI'
import { useAuth } from '@/lib/auth-context'
import { track } from '@/lib/analytics'

const ONE_TIME = [
  { label: 'Story',   base: 499,  bonus: 51,    total: 550,   price: '$4.99',  highlight: false, badge: null },
  { label: 'Novel',   base: 999,  bonus: 201,   total: 1200,  price: '$9.99',  highlight: true,  badge: 'Best value' },
  { label: 'Library', base: 2499, bonus: 1001,  total: 3500,  price: '$24.99', highlight: false, badge: null },
  { label: 'Saga',    base: 4999, bonus: 4251,  total: 9250,  price: '$49.99', highlight: false, badge: 'Power reader' },
  { label: 'Titan',   base: 9999, bonus: 10001, total: 20000, price: '$99.99', highlight: false, badge: 'Best deal' },
]
const SUBS = [
  { label: 'Reader',  price: '$4.99/mo', tokens: 700,  vsBundle: 550,  savingPct: 27, highlight: false, badge: null,
    perks: ['700 tokens / month', 'Multi-novel chat included', 'Ad-free everywhere', 'Discord: custom color role + private channel', 'Cancel anytime'] },
  { label: 'Scholar', price: '$9.99/mo', tokens: 1600, vsBundle: 1200, savingPct: 33, highlight: true,  badge: 'Best sub',
    perks: ['1,600 tokens / month', 'Multi-novel chat included', 'Ad-free everywhere', 'Discord: custom color role + private channel', 'Early access to new features', 'Priority support', 'Cancel anytime'] },
]
const FAQ = [
  { q: 'What are tokens?', a: 'Tokens are the in-app currency for AI features. Asking a question in chat costs 10 tokens; the Recommender costs 10. Reading chapters is free — you only spend tokens on AI features.' },
  { q: 'Do tokens expire?', a: 'No. Purchased tokens never expire and carry over indefinitely.' },
  { q: 'Can I get a refund?', a: 'Within 7 days of purchase if you have not used any tokens from that purchase. Contact hello@novelcodex.org.' },
  { q: 'How do subscriptions work?', a: 'They bill monthly and deposit tokens each renewal. Cancel anytime from the Stripe billing portal.' },
]
const WELCOME_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

function useCountdown(expiresAt: number) {
  const [remaining, setRemaining] = useState<number | null>(null) // measured client-side (avoids Date.now() during render)
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, expiresAt - Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])
  const t = Math.floor((remaining ?? 0) / 1000)
  return { d: Math.floor(t / 86400), h: Math.floor((t % 86400) / 3600), m: Math.floor((t % 3600) / 60), s: t % 60, expired: remaining !== null && remaining <= 0 }
}

async function startCheckout(tier: string, mode: string, setLoading: (v: string | null) => void, setError: (v: string | null) => void) {
  setLoading(`${mode}-${tier}`); setError(null)
  track('checkout_start', { tier, mode })
  try {
    const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier, mode }) })
    const d = await r.json()
    if (!r.ok || !d.url) { setError(d.error ?? 'Could not start checkout. Please try again.'); setLoading(null); return }
    window.location.href = d.url
  } catch { setError('Network error — please try again.'); setLoading(null) }
}

export default function TestShopPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'once' | 'sub'>('once')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [faqOpen, setFaqOpen] = useState<string | null>(null)

  const handleBuy = (tier: string, mode: string) => {
    if (!user) { setError('Please sign in to purchase tokens.'); return }
    startCheckout(tier, mode, setLoading, setError)
  }

  const [newMember, setNewMember] = useState(false) // measured client-side (no Date.now() during render)
  useEffect(() => {
    setNewMember(!!user && (Date.now() - new Date(user.created_at ?? 0).getTime()) < WELCOME_WINDOW_MS)
  }, [user])

  return (
    <div className="tnl-root relative min-h-screen text-white" style={{ ['--v' as string]: '124,58,237' }}>
      <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: '#07060d' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(85% 55% at 50% -10%, rgba(var(--v),0.26) 0%, transparent 55%)' }} />
      </div>

      <TestHeader />

      <main className="relative z-10 mx-auto max-w-5xl px-4 pb-24 pt-12 sm:px-6">
        <div className="mb-9 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(var(--v),0.4)] bg-[rgba(var(--v),0.12)] px-4 py-1.5">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="rgb(var(--v))"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            <span className="text-xs font-semibold" style={{ color: 'rgb(var(--v))' }}>Token Shop</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Get more conversations</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/55">Tokens never expire. 1 message ≈ 10 tokens. Reading is always free.{user ? '' : ' New accounts get 50 free tokens.'}</p>
          {user && <p className="mt-2 text-sm text-white/70">Balance: <span className="font-bold" style={{ color: 'rgb(var(--v))' }}>{(user.tokens ?? 0).toLocaleString()}</span> tokens</p>}
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-400">
            {error}{!user && <Link href="/testlogin?return=/testshop" className="ml-2 underline">Sign in</Link>}
          </div>
        )}

        {newMember && <WelcomeDeal createdAt={user!.created_at} loading={loading} onBuy={handleBuy} />}

        {/* Tabs */}
        <div className="mx-auto mb-8 flex max-w-xs gap-1 rounded-xl p-1 tnl-panel">
          {([['once', 'One-time'], ['sub', 'Subscription']] as const).map(([m, label]) => (
            <button key={m} onClick={() => setTab(m)} className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${tab === m ? 'text-white' : 'text-white/55 hover:text-white'}`}
              style={tab === m ? { background: 'rgb(var(--v))' } : {}}>{label}</button>
          ))}
        </div>

        {/* One-time */}
        {tab === 'once' && (
          <div className="mb-12 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {ONE_TIME.map(t => {
              const isLoading = loading === `once-${t.label}`
              return (
                <div key={t.label} className={`tnl-panel relative flex flex-col p-4 ${t.highlight ? 'ring-1 ring-[rgba(var(--v),0.7)]' : ''}`}>
                  {t.badge && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold text-white" style={{ background: t.highlight ? 'rgb(var(--v))' : 'rgba(255,255,255,0.15)' }}>{t.badge}</span>}
                  <p className="mb-1 text-sm font-bold">{t.label}</p>
                  <p className="mb-0.5 text-xs text-white/55">{t.base.toLocaleString()} tokens</p>
                  <p className={`mb-3 text-xs font-semibold ${t.bonus > 0 ? 'text-emerald-400' : 'text-white/40'}`}>{t.bonus > 0 ? `+${t.bonus.toLocaleString()} bonus` : 'Base rate'}</p>
                  <div className="mb-3 mt-auto">
                    <p className="text-base font-bold leading-none" style={{ color: 'rgb(var(--v))' }}>{t.total.toLocaleString()}<span className="ml-1 text-xs font-normal text-white/45">total</span></p>
                    <p className="mt-1 text-xl font-bold">{t.price}</p>
                  </div>
                  <button onClick={() => handleBuy(t.label, 'once')} disabled={!!loading}
                    className="w-full rounded-lg py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                    style={{ background: t.highlight ? 'rgb(var(--v))' : 'rgba(255,255,255,0.1)' }}>
                    {isLoading ? 'Redirecting…' : 'Buy Now'}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Subs */}
        {tab === 'sub' && (
          <div className="mx-auto mb-12 grid max-w-2xl grid-cols-1 gap-5 sm:grid-cols-2">
            {SUBS.map(s => {
              const isLoading = loading === `sub-${s.label}`
              return (
                <div key={s.label} className={`tnl-panel relative flex flex-col p-6 ${s.highlight ? 'ring-1 ring-[rgba(var(--v),0.7)]' : ''}`}>
                  {s.badge && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold text-white" style={{ background: 'rgb(var(--v))' }}>{s.badge}</span>}
                  <p className="mb-1 text-base font-bold">{s.label}</p>
                  <p className="mb-1 text-2xl font-bold" style={{ color: 'rgb(var(--v))' }}>{s.price}</p>
                  <p className="mb-4 text-xs font-semibold text-emerald-400">{s.tokens.toLocaleString()} tokens/mo <span className="font-normal text-white/45">(vs {s.vsBundle.toLocaleString()} one-time — {s.savingPct}% more)</span></p>
                  <ul className="mb-6 space-y-2">
                    {s.perks.map(p => <li key={p} className="flex items-start gap-2 text-xs text-white/65"><span className="mt-0.5 shrink-0 text-emerald-400">✓</span>{p}</li>)}
                  </ul>
                  <button onClick={() => handleBuy(s.label, 'sub')} disabled={!!loading}
                    className="mt-auto w-full rounded-xl py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                    style={{ background: s.highlight ? 'rgb(var(--v))' : 'rgba(255,255,255,0.1)' }}>
                    {isLoading ? 'Redirecting…' : 'Subscribe'}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Ad-free */}
        <div className="tnl-panel mb-12 overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 p-5">
            <div>
              <h2 className="mb-0.5 text-sm font-bold">🚫 Remove Ads Forever</h2>
              <p className="text-xs text-white/55">One-time purchase · No subscription · Permanent</p>
            </div>
            <div className="shrink-0 text-right"><p className="text-lg font-bold" style={{ color: 'rgb(var(--v))' }}>$4.99</p><p className="text-xs text-white/40">one-time</p></div>
          </div>
          <div className="p-5">
            <ul className="mb-4 grid grid-cols-2 gap-2">
              {['No ads while reading', 'No ads on Games', 'Works across all devices', 'Never expires'].map(p => <li key={p} className="flex items-center gap-2 text-xs text-white/65"><span className="text-emerald-400">✓</span>{p}</li>)}
            </ul>
            {user?.ads_disabled ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-center text-sm font-semibold text-emerald-400">✓ You&apos;re already ad-free</div>
            ) : (
              <button onClick={() => handleBuy('AdFree', 'addon')} disabled={!!loading || !user}
                className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-50">
                {loading === 'addon-AdFree' ? 'Redirecting…' : user ? 'Remove Ads — $4.99' : 'Sign in to purchase'}
              </button>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-12">
          <h2 className="mb-6 text-center text-xl font-bold">Frequently asked questions</h2>
          <div className="mx-auto max-w-2xl">
            {FAQ.map(item => (
              <div key={item.q} className="border-t border-white/10">
                <button onClick={() => setFaqOpen(o => o === item.q ? null : item.q)} className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium transition hover:text-[rgb(var(--v))]">
                  {item.q}
                  <svg className={`h-3 w-3 shrink-0 transition-transform ${faqOpen === item.q ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <div className="grid transition-all duration-200" style={{ gridTemplateRows: faqOpen === item.q ? '1fr' : '0fr' }}>
                  <div className="overflow-hidden"><div className="pb-4 pr-8 text-sm leading-relaxed text-white/60">{item.a}</div></div>
                </div>
              </div>
            ))}
            <div className="border-t border-white/10" />
          </div>
        </div>

        {!user && (
          <div className="tnl-panel p-8 text-center">
            <h3 className="mb-2 text-lg font-bold">Ready to start?</h3>
            <p className="mb-5 text-sm text-white/60">Create a free account and get 50 welcome tokens.</p>
            <Link href="/testlogin?return=/testshop" className="inline-block rounded-full px-8 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5" style={{ background: 'rgb(var(--v))', boxShadow: '0 8px 24px rgba(var(--v),0.4)' }}>Get started free</Link>
          </div>
        )}
      </main>

      <TestStyles />
    </div>
  )
}

function WelcomeDeal({ createdAt, loading, onBuy }: { createdAt: string; loading: string | null; onBuy: (tier: string, mode: string) => void }) {
  const { d, h, m, s, expired } = useCountdown(new Date(createdAt).getTime() + WELCOME_WINDOW_MS)
  if (expired) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <div className="tnl-panel mb-10 overflow-hidden p-6" style={{ background: 'linear-gradient(135deg, rgba(var(--v),0.18) 0%, rgba(var(--v),0.05) 100%)' }}>
      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: 'rgb(var(--v))' }}>⚡ New Member Offer — Limited Time</div>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="mb-1 text-2xl font-extrabold">500 tokens for <span style={{ color: 'rgb(var(--v))' }}>$1.00</span></h2>
          <p className="mb-3 text-sm text-white/60">That&apos;s <span className="font-bold" style={{ color: 'rgb(var(--v))' }}>5× the normal value</span> — enough for 50 chats or recommendations.</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-white/20 px-2.5 py-1 text-white/40 line-through">Normal: 100 / $1</span>
            <span className="rounded-full border border-[rgba(var(--v),0.5)] bg-[rgba(var(--v),0.12)] px-2.5 py-1 font-semibold" style={{ color: 'rgb(var(--v))' }}>Deal: 500 / $1 ✦ 500% value</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-3">
          <div className="flex items-center gap-1.5">
            {[{ v: d, u: 'd' }, { v: h, u: 'h' }, { v: m, u: 'm' }, { v: s, u: 's' }].map(({ v, u }) => (
              <div key={u} className="flex flex-col items-center">
                <div className="min-w-[2.5rem] rounded-lg border border-[rgba(var(--v),0.3)] bg-[rgba(var(--v),0.1)] px-2.5 py-1.5 text-center"><span className="font-mono text-lg font-bold" style={{ color: 'rgb(var(--v))' }}>{pad(v)}</span></div>
                <span className="mt-0.5 text-[10px] text-white/40">{u}</span>
              </div>
            ))}
          </div>
          <button onClick={() => onBuy('Welcome', 'once')} disabled={!!loading}
            className="w-full rounded-xl px-8 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-50"
            style={{ background: 'rgb(var(--v))', boxShadow: '0 8px 24px rgba(var(--v),0.4)' }}>
            {loading === 'once-Welcome' ? 'Redirecting…' : 'Claim Offer — $1.00'}
          </button>
        </div>
      </div>
    </div>
  )
}
