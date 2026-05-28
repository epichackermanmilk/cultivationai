'use client'

import { useState, useEffect } from 'react'
import {
  toggleBookmark, serverToggleBookmark,
  getBookmarkedSlugs, ensureServerSync,
  type NovelMeta,
} from '@/lib/bookmarks'
import { useAuth } from '@/lib/auth-context'

interface Props {
  novel: NovelMeta
  className?: string
  size?: 'sm' | 'md'
}

export default function BookmarkButton({ novel, className = '', size = 'sm' }: Props) {
  const { user } = useAuth()
  const [saved,   setSaved]   = useState(false)
  const [loading, setLoading] = useState(false)

  // Initialise state: server-synced for logged-in users, localStorage for guests
  useEffect(() => {
    if (user) {
      ensureServerSync().then(slugs => setSaved(slugs.has(novel.slug)))
    } else {
      setSaved(getBookmarkedSlugs().has(novel.slug))
    }
  }, [novel.slug, user])

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (loading) return

    // Optimistic update
    setSaved(v => !v)
    setLoading(true)

    try {
      if (user) {
        const next = await serverToggleBookmark(novel)
        setSaved(next)
      } else {
        const next = toggleBookmark(novel)
        setSaved(next)
      }
    } catch {
      // Roll back optimistic update on error
      setSaved(v => !v)
    } finally {
      setLoading(false)
    }
  }

  const sz = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5'

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title={saved ? 'Remove bookmark' : 'Bookmark novel'}
      aria-label={saved ? 'Remove bookmark' : 'Bookmark novel'}
      className={`flex items-center justify-center rounded-full border transition-all disabled:opacity-60 ${
        saved
          ? 'border-rose-400/50 text-rose-400 hover:text-rose-300 hover:border-rose-300/60'
          : 'border-zinc-600 text-zinc-500 hover:text-rose-400 hover:border-rose-400/50'
      } ${className}`}
    >
      <svg className={sz} fill={saved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  )
}
