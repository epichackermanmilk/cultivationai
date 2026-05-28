'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBookmarks, toggleBookmark, type NovelMeta } from '@/lib/bookmarks'
import ThemeToggle   from '@/components/ThemeToggle'
import TokenWidget   from '@/components/TokenWidget'
import FeedbackWidget from '@/components/FeedbackWidget'

export default function BookmarksPage() {
  const [books, setBooks] = useState<NovelMeta[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setBooks(getBookmarks())
    setMounted(true)
  }, [])

  function remove(novel: NovelMeta) {
    toggleBookmark(novel)               // removes from localStorage
    setBooks(prev => prev.filter(b => b.slug !== novel.slug))
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--nc-border)] px-4 py-3"
        style={{ background: 'var(--nc-bg)' }}
      >
        <Link href="/library" className="text-zinc-400 hover:text-zinc-100 transition-colors text-sm">
          ← Back
        </Link>
        <div className="h-4 w-px bg-zinc-700" />
        <h1 className="flex-1 text-sm font-semibold text-amber-400">My Bookmarks</h1>
        <TokenWidget />
        <ThemeToggle />
      </header>

      <main className="flex-1 px-4 py-6 mx-auto w-full max-w-4xl">
        {!mounted ? (
          /* Skeleton */
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-zinc-800 animate-pulse aspect-[3/4]" />
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <span className="text-5xl">🔖</span>
            <p className="text-base font-semibold" style={{ color: 'var(--nc-text)' }}>No bookmarks yet</p>
            <p className="text-sm text-zinc-500 max-w-xs">
              Tap the ♡ heart on any novel card to save it here for quick access.
            </p>
            <Link
              href="/library"
              className="mt-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 transition"
            >
              Browse novels
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-4 text-xs text-zinc-500">
              {books.length} saved novel{books.length !== 1 ? 's' : ''} · stored locally in your browser
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {books.map(novel => (
                <div key={novel.slug} className="group relative flex flex-col gap-2">
                  {/* Cover */}
                  <Link href={`/novel/${novel.slug}`} className="block">
                    <div
                      className="relative overflow-hidden rounded-xl border border-[var(--nc-border)] transition group-hover:border-amber-500/50"
                      style={{ aspectRatio: '3/4', background: 'var(--nc-bg3)' }}
                    >
                      {novel.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={novel.cover_url}
                          alt={novel.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center p-3">
                          <span className="text-center text-xs leading-tight font-medium" style={{ color: 'var(--nc-text2)' }}>
                            {novel.title}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                      {/* Chapter count pill */}
                      {novel.total_chapters > 0 && (
                        <span className="absolute bottom-1.5 right-2 text-xs font-medium text-zinc-200">
                          {novel.total_chapters.toLocaleString()} ch
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Title + author */}
                  <div className="flex-1 min-w-0">
                    <Link href={`/novel/${novel.slug}`}>
                      <p className="text-xs font-semibold leading-tight line-clamp-2 group-hover:text-amber-400 transition-colors" style={{ color: 'var(--nc-text)' }}>
                        {novel.title}
                      </p>
                    </Link>
                    {novel.author && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--nc-text2)' }}>
                        {novel.author}
                      </p>
                    )}
                  </div>

                  {/* Remove bookmark button */}
                  <button
                    onClick={() => remove(novel)}
                    title="Remove bookmark"
                    className="absolute -top-2 -right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 text-zinc-400 opacity-0 transition group-hover:opacity-100 hover:border-rose-400 hover:text-rose-400 hover:bg-zinc-900"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <FeedbackWidget />
    </div>
  )
}
