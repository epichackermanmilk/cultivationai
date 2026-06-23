'use client'

// /shop — token shop, redesigned to the /test* standard (dark glass, purple).
// Same backend as /shop: POST /api/checkout (Stripe). Welcome deal, one-time tiers,
// subscriptions, permanent ad-free add-on, FAQ.

import { useState, useEffect } from 'react'
import Link from 'next/link'
import TestHeader from '@/components/TestHeader'
import { TestStyles } from '@/components/TestUI'
import TestFooter from '@/components/TestFooter'
import { useAuth } from '@/lib/auth-context'
import { track } from '@/lib/analytics'

const ONE_TIME = [
  { label: 'Spark',   base: 100,  bonus: 0,     total: 100,   price: '$0.99',  highlight: false, badge: null },
  { label: 'Story',   base: 499,  bonus: 51,    total: 550,   price: '$4.99',  highlight: false, badge: null },
  { label: 'Novel',   base: 999,  bonus: 201,   total: 1200,  price: '$9.99',  highlight: true,  badge: 'Best value' },
  { label: 'Library', base: 2499, bonus: 1001,  total: 3500,  price: '$24.99', highlight: false, badge: null },
  { label: 'Saga',    base: 4999, bonus: 4251,  total: 9250,  price: '$49.99', highlight: false, badge: 'Power reader' },
  { label: 'Titan',   base: 9999, bonus: 10001, total: 20000, price: '$99.99', highlight: false, badge: 'Best deal' },
]
const SUBS = [
  { label: 'Lite',    price: '$2.99/mo', tokens: 150,  vsBundle: 0,    savingPct: 0,  highlight: false, badge: null,
    perks: ['Ad-free everywhere', 'Read every locked chapter', '150 tokens / month', 'Free EPUB downloads', 'Cancel anytime'] },
  { label: 'Reader',  price: '$4.99/mo', tokens: 700,  vsBundle: 550,  savingPct: 27, highlight: false, badge: null,
    perks: ['Ad-free everywhere', 'Read every locked chapter', '700 tokens / month', 'Free EPUB downloads', 'Multi-novel chat included', 'Cancel anytime'] },
  { label: 'Scholar', price: '$9.99/mo', tokens: 1600, vsBundle: 1200, savingPct: 33, highlight: true,  badge: 'Best sub',
    perks: ['Ad-free everywhere', 'Read every locked chapter', '1,600 tokens / month', 'Free EPUB downloads', 'Multi-novel chat included', 'Early access to new features', 'Priority support', 'Cancel anytime'] },
]
const FAQ = [
  { q: 'What are tokens?', a: 'Tokens are the in-app currency. Most of the site is free: reading is free (ad-supported), and so is browsing. You spend tokens on extras — AI chat (10/message), the Recommender (10/search), unlocking a locked chapter (2 each), or an EPUB download (50).' },
  { q: 'Why are some chapters locked?', a: 'The latest ~20% of every novel is reserved for supporters. Read them with any active subscription, or unlock individual chapters for 2 tokens each. Everything before that is free to read.' },
  { q: 'Do I keep locked chapters if I cancel?', a: 'Subscription access to locked chapters is active only while your subscription is. Chapters you unlocked with tokens are yours to keep forever.' },
  { q: 'Can I download a novel?', a: 'Yes — download any novel as an EPUB, choosing the exact chapter range, up to 500 chapters per file (download again for more). It includes the chapters you can read (free chapters plus any you have unlocked); locked chapters you have not unlocked are skipped. Free for subscribers, otherwise 50 tokens. Subscribers can download up to 20 EPUBs per hour, everyone else up to 5.' },
  { q: 'Do tokens expire?', a: 'No. Purchased tokens never expire and carry over indefinitely.' },
  { q: 'Can I get a refund?', a: 'Within 7 days of purchase if you have not used any tokens from that purchase. Contact hello@novelcodex.org.' },
  { q: 'How do subscriptions work?', a: 'They bill monthly: ad-free everywhere, all locked chapters, free EPUBs, plus monthly tokens. Cancel anytime from the Stripe billing portal.' },
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
    <div className="tnl-root relative flex min-h-screen flex-col text-white" style={{ ['--v' as string]: '124,58,237' }}>
      <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: '#07060d' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(85% 55% at 50% -10%, rgba(var(--v),0.26) 0%, transparent 55%)' }} />
      </div>

      <TestHeader />

      <main className="relative z-10 mx-auto w-full flex-1 max-w-5xl px-4 pb-24 pt-12 sm:px-6">
        <div className="mb-9 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(var(--v),0.4)] bg-[rgba(var(--v),0.12)] px-4 py-1.5">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="rgb(var(--v))"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            <span className="text-xs font-semibold" style={{ color: 'rgb(var(--v))' }}>Token Shop</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Unlock more of NovelCodex</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-white/55">Reading is free. Subscribe for ad-free reading, every locked chapter, and free EPUB downloads — or use tokens to unlock chapters, chat with characters, and get recommendations. Tokens never expire.{user ? '' : ' New accounts start with 50 free tokens.'}</p>
          {user && <p className="mt-2 text-sm text-white/70">Balance: <span className="font-bold" style={{ color: 'rgb(var(--v))' }}>{(user.tokens ?? 0).toLocaleString()}</span> tokens</p>}
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-400">
            {error}{!user && <Link href="/login?return=/shop" className="ml-2 underline">Sign in</Link>}
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
                <div key={t.label} className={`tnl-panel relative flex flex-col gap-1 p-3.5 ${t.highlight ? 'ring-1 ring-[rgba(var(--v),0.7)]' : ''}`}>
                  {t.badge && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white" style={{ background: t.highlight ? 'rgb(var(--v))' : 'rgba(255,255,255,0.15)' }}>{t.badge}</span>}
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-bold">{t.label}</p>
                    <p className="text-base font-bold">{t.price}</p>
                  </div>
                  <p className="text-2xl font-black leading-none" style={{ color: 'rgb(var(--v))' }}>{t.total.toLocaleString()}<span className="ml-1 text-[11px] font-normal text-white/45">tokens</span></p>
                  <p className={`text-[11px] font-semibold ${t.bonus > 0 ? 'text-emerald-400' : 'text-white/35'}`}>{t.bonus > 0 ? `incl. +${t.bonus.toLocaleString()} bonus` : 'base rate'}</p>
                  <button onClick={() => handleBuy(t.label, 'once')} disabled={!!loading}
                    className="mt-1.5 w-full rounded-lg py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50"
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
          <div className="mx-auto mb-12 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-3">
            {SUBS.map(s => {
              const isLoading = loading === `sub-${s.label}`
              return (
                <div key={s.label} className={`tnl-panel relative flex flex-col p-6 ${s.highlight ? 'ring-1 ring-[rgba(var(--v),0.7)]' : ''}`}>
                  {s.badge && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold text-white" style={{ background: 'rgb(var(--v))' }}>{s.badge}</span>}
                  <p className="mb-1 text-base font-bold">{s.label}</p>
                  <p className="mb-1 text-2xl font-bold" style={{ color: 'rgb(var(--v))' }}>{s.price}</p>
                  <p className="mb-4 text-xs font-semibold text-emerald-400">{s.tokens.toLocaleString()} tokens/mo{s.vsBundle > 0 && <span className="font-normal text-white/45"> · {s.savingPct}% more vs one-time</span>}</p>
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
            <Link href="/login?return=/shop" className="inline-block rounded-full px-8 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5" style={{ background: 'rgb(var(--v))', boxShadow: '0 8px 24px rgba(var(--v),0.4)' }}>Get started free</Link>
          </div>
        )}
      </main>

      <TestFooter />
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
