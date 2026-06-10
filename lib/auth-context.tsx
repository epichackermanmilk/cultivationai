'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

export interface AuthUser {
  id:                      string
  email:                   string
  tokens:                  number
  username:                string | null
  onboarding_bonus_claimed: boolean
  created_at:              string   // ISO timestamp — used for welcome deal countdown
  ads_disabled:            boolean  // true = one-time ad-free purchase or manually granted
  subscription_active:     boolean  // true = active subscriber (auto-cleared on cancel)
  discord_user_id:         string | null
  discord_verified:        boolean
  tokens_ever_purchased:   number
  has_password:            boolean  // false = Google-only account (no password to change)
}

interface AuthCtx {
  user:         AuthUser | null
  loading:      boolean
  refresh:      () => Promise<void>
  logout:       () => Promise<void>
  updateTokens: (n: number) => void   // optimistic update after chat deduction
}

const Ctx = createContext<AuthCtx>({
  user: null, loading: true, refresh: async () => {}, logout: async () => {}, updateTokens: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      let r = await fetch('/api/auth/me')
      let d = await r.json()
      if (!d.user) {
        // Access token may have expired — try to renew it from the refresh token.
        const rr = await fetch('/api/auth/refresh', { method: 'POST' })
        if (rr.ok) { r = await fetch('/api/auth/me'); d = await r.json() }
      }
      setUser(d.user ?? null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // Keep the session alive: the Supabase access token expires after ~1h, so renew
  // it periodically while signed in. Without this, long sessions (e.g. waiting for
  // multi-novel indexing) hit "session expired" and get signed out.
  useEffect(() => {
    if (!user?.id) return
    const id = window.setInterval(() => {
      fetch('/api/auth/refresh', { method: 'POST' }).catch(() => {})
    }, 45 * 60 * 1000)   // every 45 min (token lives ~60)
    return () => window.clearInterval(id)
  }, [user?.id])

  // Re-sync user data (token balance, perks, Discord status) whenever the tab
  // regains focus. Without this, a balance change made in Supabase, by the Stripe
  // webhook, or in another tab stays stale on screen until a full reload.
  useEffect(() => {
    if (!user?.id) return
    let last = Date.now()
    const resync = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - last < 20_000) return   // throttle bursts
      last = Date.now()
      refresh()
    }
    document.addEventListener('visibilitychange', resync)
    window.addEventListener('focus', resync)
    return () => {
      document.removeEventListener('visibilitychange', resync)
      window.removeEventListener('focus', resync)
    }
  }, [user?.id, refresh])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }

  const updateTokens = useCallback((n: number) => {
    setUser(prev => prev ? { ...prev, tokens: n } : prev)
  }, [])

  return <Ctx.Provider value={{ user, loading, refresh, logout, updateTokens }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
