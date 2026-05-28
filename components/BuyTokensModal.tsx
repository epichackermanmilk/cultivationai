'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface Props { onClose: () => void }

// ── One-time tiers ────────────────────────────────────────────────────────────
const ONE_TIME = [
  { label: 'Spark',   base: 100,  bonus: 0,     total: 100,    price: '$1.00',  priceNum: 1,    highlight: false, badge: null },
  { label: 'Story',   base: 499,  bonus: 51,    total: 550,    price: '$4.99',  priceNum: 4.99, highlight: false, badge: null },
  { label: 'Novel',   base: 999,  bonus: 201,   total: 1200,   price: '$9.99',  priceNum: 9.99, highlight: true,  badge: 'Best value' },
  { label: 'Library', base: 2499, bonus: 1001,  total: 3500,   price: '$24.99', priceNum: 24.99,highlight: false, badge: null },
  { label: 'Saga',    base: 4999, bonus: 4251,  total: 9250,   price: '$49.99', priceNum: 49.99,highlight: false, badge: 'Power reader' },
  { label: 'Titan',   base: 9999, bonus: 10001, total: 20000,  price: '$99.99', priceNum: 99.99,highlight: false, badge: 'Best deal' },
]

// ── Subscription tiers ────────────────────────────────────────────────────────
const SUBS = [
  {
    label: 'Reader',
    price: '$4.99/mo',
    priceNum: 4.99,
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
    priceNum: 9.99,
    tokens: 1600,
    vsBundle: 1200,
    savingPct: 33,
    highlight: true,
    perks: ['1,600 tokens / month', 'Multi-novel chat unlocked', 'Early access to new features', 'Priority support', 'Cancel anytime'],
    badge: 'Best sub',
  },
]

export default function BuyTokensModal({ onClose }: Props) {
  const [mounted, setMounted] = useState(false)
  const [tab, setTab]         = useState<'once' | 'sub'>('once')

  useEffect(() => {
    setMounted(true)
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border p-6 shadow-2xl"
        style={{ background: 'var(--nc-bg2)', borderColor: 'var(--nc-border)' }}
      >
        {/* Header */}
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: 'var(--nc-text)' }}>
            Get Tokens
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition text-xl leading-none">×</button>
        </div>
        <p className="mb-4 text-xs text-zinc-500">
          Tokens never expire · 1 message ≈ 10 tokens · Buy once, use any time
        </p>

        {/* Tab switcher */}
        <div className="mb-5 flex rounded-xl border border-zinc-700 overflow-hidden text-sm font-medium">
          <button
            onClick={() => setTab('once')}
            className={`flex-1 py-2 transition ${tab === 'once' ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            One-time
          </button>
          <button
            onClick={() => setTab('sub')}
            className={`flex-1 py-2 transition ${tab === 'sub' ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Subscription
          </button>
        </div>

        {/* ── ONE-TIME ── */}
        {tab === 'once' && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ONE_TIME.map(t => (
              <div
                key={t.label}
                className={`relative rounded-xl border p-3.5 flex flex-col transition ${
                  t.highlight ? 'border-amber-500 bg-amber-500/10' : 'border-[var(--nc-border)]'
                }`}
                style={t.highlight ? {} : { background: 'var(--nc-bg3, var(--nc-bg))' }}
              >
                {t.badge && (
                  <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap ${
                    t.highlight ? 'bg-amber-500 text-black' : 'bg-zinc-700 text-zinc-300'
                  }`}>
                    {t.badge}
                  </span>
                )}
                <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--nc-text)' }}>{t.label}</p>
                <p className="text-xs text-zinc-500 mb-0.5">{t.base.toLocaleString()} tokens</p>
                <p className={`text-xs font-semibold mb-2 ${t.bonus > 0 ? 'text-green-400' : 'text-zinc-600'}`}>
                  {t.bonus > 0 ? `+${t.bonus.toLocaleString()} bonus` : 'Base rate'}
                </p>
                <div className="mt-auto">
                  <p className="text-base font-bold text-amber-400 leading-none">
                    {t.total.toLocaleString()}
                    <span className="text-xs font-normal text-zinc-500 ml-1">total</span>
                  </p>
                  <p className="text-lg font-bold mt-1" style={{ color: 'var(--nc-text)' }}>{t.price}</p>
                </div>
                <button
                  disabled
                  className={`mt-3 w-full rounded-lg py-1.5 text-xs font-semibold cursor-not-allowed opacity-60 ${
                    t.highlight ? 'bg-amber-500 text-black' : 'bg-zinc-700 text-zinc-300'
                  }`}
                >
                  Coming soon
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── SUBSCRIPTION ── */}
        {tab === 'sub' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {SUBS.map(s => (
              <div
                key={s.label}
                className={`relative rounded-xl border p-5 flex flex-col transition ${
                  s.highlight ? 'border-amber-500 bg-amber-500/10' : 'border-[var(--nc-border)]'
                }`}
                style={s.highlight ? {} : { background: 'var(--nc-bg3, var(--nc-bg))' }}
              >
                {s.badge && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 text-black px-2 py-0.5 text-xs font-bold whitespace-nowrap">
                    {s.badge}
                  </span>
                )}
                <p className="text-base font-bold mb-0.5" style={{ color: 'var(--nc-text)' }}>{s.label}</p>
                <p className="text-2xl font-bold text-amber-400 mb-1">{s.price}</p>
                <p className="text-xs text-green-400 font-medium mb-3">
                  {s.tokens.toLocaleString()} tokens/mo
                  <span className="text-zinc-500 font-normal ml-1">
                    (vs {s.vsBundle.toLocaleString()} one-time — {s.savingPct}% more)
                  </span>
                </p>
                <ul className="space-y-1.5 mb-4 mt-auto">
                  {s.perks.map(p => (
                    <li key={p} className="flex items-start gap-2 text-xs" style={{ color: 'var(--nc-text2)' }}>
                      <span className="text-green-400 mt-0.5">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
                <button
                  disabled
                  className={`w-full rounded-xl py-2.5 text-sm font-semibold cursor-not-allowed opacity-60 ${
                    s.highlight ? 'bg-amber-500 text-black' : 'bg-zinc-700 text-zinc-300'
                  }`}
                >
                  Coming soon
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="mt-5 text-center text-xs text-zinc-600">
          Payment integration coming soon · Subscriptions billed monthly · Cancel anytime
        </p>
      </div>
    </div>,
    document.body
  )
}
