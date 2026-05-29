'use client'

import { createContext, useContext } from 'react'

// Light mode removed — site is always dark
interface ThemeCtx {
  theme:  'dark'
  toggle: () => void
}

const Ctx = createContext<ThemeCtx>({ theme: 'dark', toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <Ctx.Provider value={{ theme: 'dark', toggle: () => {} }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)
