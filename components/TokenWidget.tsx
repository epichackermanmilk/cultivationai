'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import AuthModal from './AuthModal'
import BuyTokensModal from './BuyTokensModal'

export default function TokenWidget() {
  const { user, loading, logout } = useAuth()
  const [showAuth,    setShowAuth]    = useState(false)
  const [showBuy,     setShowBuy]     = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (loading) {
    return <div className="h-8 w-20 animate-pulse rounded-lg bg-zinc-800" />
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowAuth(true)}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:border-amber-500/50 hover:text-amber-400 transition"
        >
          {/* Person icon */}
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          Profile
        </button>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </>
    )
  }

  return (
    <>
      {/* Token badge + dropdown */}
      <div className="relative" ref={dropRef}>
        <button
          onClick={() => setShowDropdown(v => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition"
        >
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M11.3 1.046A1 1 0 0110 2v3a1 1 0 001.447.894l5-2.5A1 1 0 0017 2.5V2a1 1 0 00-1-1H11.5a1 1 0 00-.2.046zM3 6a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V6zm2 2a1 1 0 000 2h2a1 1 0 000-2H5zm0 4a1 1 0 000 2h2a1 1 0 000-2H5zm4 0a1 1 0 000 2h2a1 1 0 000-2H9zm0-4a1 1 0 000 2h2a1 1 0 000-2H9z" />
          </svg>
          {user.tokens.toLocaleString()}
          <svg className="h-3 w-3 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDropdown && (
          <div
            className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-[var(--nc-border)] p-3 shadow-xl z-50"
            style={{ background: 'var(--nc-bg2)' }}
          >
            {/* Identity row */}
            <p className="truncate text-xs font-medium mb-0.5" style={{ color: 'var(--nc-text)' }}>
              {user.username ?? user.email}
            </p>
            {user.username && (
              <p className="truncate text-xs mb-0.5" style={{ color: 'var(--nc-text2)' }}>
                {user.email}
              </p>
            )}
            <p className="text-xs mb-3" style={{ color: 'var(--nc-text2)' }}>
              <span className="font-semibold text-amber-400">{user.tokens.toLocaleString()}</span> tokens remaining
            </p>

            {/* Onboarding nudge if profile incomplete */}
            {!user.onboarding_bonus_claimed && (
              <Link
                href="/profile"
                onClick={() => setShowDropdown(false)}
                className="mb-2 flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition"
              >
                <span>⚡</span>
                <span>Complete profile → earn 10 tokens</span>
              </Link>
            )}

            <button
              onClick={() => { setShowDropdown(false); setShowBuy(true) }}
              className="mb-2 w-full rounded-lg bg-amber-500 py-2 text-xs font-semibold text-black hover:bg-amber-400 transition"
            >
              ⚡ Buy Tokens
            </button>
            <Link
              href="/profile"
              onClick={() => setShowDropdown(false)}
              className="mb-1 block w-full rounded-lg py-1.5 text-center text-xs transition hover:text-amber-400"
              style={{ color: 'var(--nc-text2)' }}
            >
              View Profile
            </Link>
            <button
              onClick={() => { setShowDropdown(false); logout() }}
              className="w-full rounded-lg py-1.5 text-xs transition"
              style={{ color: 'var(--nc-text2)' }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>

      {showBuy  && <BuyTokensModal onClose={() => setShowBuy(false)} />}
    </>
  )
}
