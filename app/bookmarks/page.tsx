'use client'

import { useEffect, useState } from 'react'
import Link        from 'next/link'
import { getBookmarks, serverToggleBookmark, toggleBookmark, invalidateBookmarkCache, type NovelMeta } from '@/lib/bookmarks'
import { useAuth } from '@/lib/auth-context'
import SiteHeader  from '@/components/SiteHeader'
import FeedbackWidget from '@/components/FeedbackWidget'
import Footer         from '@/components/Footer'
import AdSlot         from '@/components/AdSlot'

export default function BookmarksPage() {
  const { user, loading: authLoading } = useAuth()
  const [books,   setBooks]   = useState<NovelMeta[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (authLoading) return

    if (user) {
      // Fetch from Supabase
      fetch('/api/bookmarks')
        .then(r => r.ok ? r.json() : { bookmarks: [] })
        .then(data => {
          setBooks(data.bookmarks ?? [])
          setMounted(true)
        })
        .catch(() => {
          // Fallback to localStorage on error
          setBooks(getBookmarks())
          setMounted(true)
        })
    } else {
      // Guest: use localStorage
      setBooks(getBookmarks())
      setMounted(true)
    }
  }, [user, authLoading])

  async function remove(novel: NovelMeta) {
    if (user) {
      await serverToggleBookmark(novel)   // removes from server + cache
    } else {
      toggleBookmark(novel)               // removes from localStorage
    }
    setBooks(prev => prev.filter(b => b.slug !== novel.slug))
  }

  const storageLabel = user
    ? 'synced to your account'
    : 'stored locally in your browser'

  return (
    <div className="min-h-screen flex flex-col pb-16 sm:pb-0" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>
      {/* Header */}
      <SiteHeader />

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-8">
        <aside className="hidden xl:block w-40 shrink-0"><AdSlot variant="side" /></aside>
        <main className="min-w-0 flex-1">
        <h1 className="mb-6 text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--nc-text)' }}>Your Bookmarks</h1>
        {!mounted ? (
          /* Nothing until mounted — bookmarks read from localStorage synchronously
             on mount, so a skeleton just flashes empty boxes for a frame. */
          <div className="min-h-[40vh]" />
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
            <p className="mb-5 text-sm text-zinc-500">
              {books.length} saved novel{books.length !== 1 ? 's' : ''} · {storageLabel}
            </p>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
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
                      <p className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-amber-400 transition-colors" style={{ color: 'var(--nc-text)' }}>
                        {novel.title}
                      </p>
                    </Link>
                    {novel.author && (
                      <p className="text-xs mt-1 truncate" style={{ color: 'var(--nc-text2)' }}>
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
        <aside className="hidden xl:block w-40 shrink-0"><AdSlot variant="side" /></aside>
      </div>

      <Footer />
      <FeedbackWidget />
    </div>
  )
}
