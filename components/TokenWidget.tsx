'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import AuthModal from './AuthModal'

// ── Icon helpers ──────────────────────────────────────────────────────────────
const IcoUser = () => (
  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
const IcoWallet = () => (
  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18-3a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
  </svg>
)
const IcoSupport = () => (
  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
  </svg>
)
const IcoSignOut = () => (
  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
  </svg>
)

// ── Shared row style ──────────────────────────────────────────────────────────
const ROW = 'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-800/50'
const ROW_BORDER = { borderBottom: '1px solid var(--nc-border)' }

export default function TokenWidget() {
  const { user, loading, logout } = useAuth()
  const [showAuth,     setShowAuth]     = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setShowDropdown(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  if (loading) return <div className="h-8 w-24 animate-pulse rounded-lg bg-zinc-800" />

  // ── Unauthenticated ───────────────────────────────────────────────────────
  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowAuth(true)}
          className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-sm font-medium text-amber-400 hover:border-amber-500/60 hover:bg-amber-500/20 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          Sign In
        </button>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </>
    )
  }

  // ── Authenticated ─────────────────────────────────────────────────────────
  return (
    <>
      <div className="relative flex items-center gap-2" ref={dropRef}>
        {/* Token balance pill — taps through to the shop */}
        <Link
          href="/shop"
          className="flex h-9 items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 text-sm font-bold text-amber-400 transition hover:bg-amber-500/20"
          aria-label={`${user.tokens} tokens — buy more`}
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <span className="tabular-nums">{user.tokens.toLocaleString()}</span>
        </Link>

        {/* Account box — opens the dropdown menu */}
        <button
          onClick={() => setShowDropdown(v => !v)}
          className="flex h-9 items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-300 transition hover:border-amber-500/50 hover:text-amber-400"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <span className="hidden sm:inline">Account</span>
          <svg
            className={`h-3 w-3 shrink-0 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown — compact, matches the Account box width */}
        {showDropdown && (
          <div
            className="absolute right-0 top-full mt-2 w-44 rounded-xl border shadow-2xl z-50 overflow-hidden"
            style={{ background: 'var(--nc-bg2)', borderColor: 'var(--nc-border)' }}
          >
            {/* Profile */}
            <Link href="/profile" onClick={() => setShowDropdown(false)} className={ROW}
              style={{ ...ROW_BORDER, color: 'var(--nc-text)' }}>
              <IcoUser />
              <span className="text-sm font-medium">Profile</span>
            </Link>

            {/* Tokens */}
            <Link href="/shop" onClick={() => setShowDropdown(false)} className={ROW}
              style={{ ...ROW_BORDER, color: 'var(--nc-text)' }}>
              <IcoWallet />
              <span className="text-sm font-medium">Tokens</span>
            </Link>

            {/* Support */}
            <Link href="/support" onClick={() => setShowDropdown(false)} className={ROW}
              style={{ ...ROW_BORDER, color: 'var(--nc-text)' }}>
              <IcoSupport />
              <span className="text-sm font-medium">Support</span>
            </Link>

            {/* Sign Out */}
            <button onClick={() => { setShowDropdown(false); logout() }} className={ROW}
              style={{ color: 'var(--nc-text2)' }}>
              <IcoSignOut />
              <span className="text-sm font-medium">Sign out</span>
            </button>
          </div>
        )}
      </div>

    </>
  )
}
