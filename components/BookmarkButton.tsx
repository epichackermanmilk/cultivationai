'use client'

import { useState, useEffect } from 'react'
import { toggleBookmark, getBookmarkedSlugs, type NovelMeta } from '@/lib/bookmarks'

interface Props {
  novel: NovelMeta
  className?: string
  size?: 'sm' | 'md'
}

export default function BookmarkButton({ novel, className = '', size = 'sm' }: Props) {
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSaved(getBookmarkedSlugs().has(novel.slug))
  }, [novel.slug])

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const next = toggleBookmark(novel)
    setSaved(next)
  }

  const sz = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5'

  return (
    <button
      onClick={handleClick}
      title={saved ? 'Remove bookmark' : 'Bookmark novel'}
      aria-label={saved ? 'Remove bookmark' : 'Bookmark novel'}
      className={`flex items-center justify-center rounded-full border transition-all ${
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
