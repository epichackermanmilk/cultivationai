'use client'

// AdSlot — renders an advertisement placeholder.
// Hidden automatically for subscribers and users who purchased ad-free.
//
// To integrate a real ad provider (Google AdSense, Carbon, etc.), replace
// the inner <div> content with the provider's script/ins tag.
//
// Supabase migration required before ads_disabled / subscription_active work:
//   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ads_disabled boolean DEFAULT false;
//   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_active boolean DEFAULT false;

import { useAuth } from '@/lib/auth-context'

interface AdSlotProps {
  /** 'banner' = full-width slim strip | 'feed' = card-sized break in a grid/list */
  variant?:  'banner' | 'feed'
  className?: string
}

export default function AdSlot({ variant = 'banner', className = '' }: AdSlotProps) {
  const { user, loading } = useAuth()

  // Don't flash during auth hydration
  if (loading) return null

  // Hide for subscribers or users who purchased ad-free
  if (user?.ads_disabled || user?.subscription_active) return null

  if (variant === 'feed') {
    return (
      <div className={`flex items-center justify-center rounded-xl border border-dashed border-zinc-700/60 bg-zinc-900/40 ${className}`}
        style={{ minHeight: 120 }}>
        <div className="text-center px-4">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Advertisement</p>
          <p className="text-xs text-zinc-700">Ad space</p>
        </div>
      </div>
    )
  }

  // Banner variant
  return (
    <div className={`w-full flex items-center justify-center border-y border-zinc-800/60 bg-zinc-900/30 py-3 ${className}`}
      style={{ minHeight: 60 }}>
      <div className="flex items-center gap-3">
        <p className="text-[10px] uppercase tracking-widest text-zinc-600">Advertisement</p>
        <div className="h-3 w-px bg-zinc-800" />
        <p className="text-xs text-zinc-700">Ad space · <a href="/shop" className="text-zinc-600 hover:text-amber-500/70 transition">Remove ads</a></p>
      </div>
    </div>
  )
}
