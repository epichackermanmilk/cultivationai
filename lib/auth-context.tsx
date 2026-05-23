'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

export interface AuthUser {
  id:     string
  email:  string
  tokens: number
}

interface AuthCtx {
  user:    AuthUser | null
  loading: boolean
  refresh: () => Promise<void>
  logout:  () => Promise<void>
}

const Ctx = createContext<AuthCtx>({
  user: null, loading: true, refresh: async () => {}, logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/auth/me')
      const d = await r.json()
      setUser(d.user ?? null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }

  return <Ctx.Provider value={{ user, loading, refresh, logout }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
