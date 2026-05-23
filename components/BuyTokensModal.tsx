'use client'

import { useEffect } from 'react'

interface Props { onClose: () => void }

const TIERS = [
  { icon: '⚡', label: 'Starter',  tokens: 500,   price: '$3',  highlight: false },
  { icon: '💎', label: 'Pro',      tokens: 2000,  price: '$9',  highlight: true  },
  { icon: '🚀', label: 'Elite',    tokens: 5000,  price: '$19', highlight: false },
  { icon: '👑', label: 'Ultimate', tokens: 15000, price: '$49', highlight: false },
]

export default function BuyTokensModal({ onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--nc-border)] p-6 shadow-2xl"
        style={{ background: 'var(--nc-bg2)' }}
      >
        {/* Header */}
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: 'var(--nc-text)' }}>Top up tokens</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition text-xl leading-none">×</button>
        </div>
        <p className="mb-5 text-xs text-zinc-500">
          Tokens are used when chatting with novels. 1 message ≈ 5 tokens.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {TIERS.map(t => (
            <div
              key={t.label}
              className={`relative rounded-xl border p-4 transition ${
                t.highlight
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-[var(--nc-border)]'
              }`}
              style={t.highlight ? {} : { background: 'var(--nc-bg3)' }}
            >
              {t.highlight && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-black whitespace-nowrap">
                  Most popular
                </span>
              )}
              <div className="text-2xl mb-2">{t.icon}</div>
              <p className="text-sm font-semibold" style={{ color: 'var(--nc-text)' }}>{t.label}</p>
              <p className="text-xs text-amber-400 font-medium">{t.tokens.toLocaleString()} tokens</p>
              <p className="mt-2 text-lg font-bold" style={{ color: 'var(--nc-text)' }}>{t.price}</p>
              <button
                disabled
                className="mt-3 w-full rounded-lg py-1.5 text-xs font-semibold transition cursor-not-allowed opacity-60 bg-amber-500 text-black"
              >
                Coming soon
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-zinc-600">
          Payment integration coming soon · All plans are one-time purchases
        </p>
      </div>
    </div>
  )
}
