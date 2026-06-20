'use client'

// /bookmarks — saved novels, redesigned to the /test* standard. Reuses the real
// bookmark data layer (lib/bookmarks + /api/bookmarks): server-synced for signed-in
// users, localStorage for guests. Covers grid, hover-to-remove, empty state.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBookmarks, serverToggleBookmark, toggleBookmark, type NovelMeta } from '@/lib/bookmarks'
import { useAuth } from '@/lib/auth-context'
import TestHeader from '@/components/TestHeader'
import { TestStyles, Cover, Skeleton, type Novel } from '@/components/TestUI'
import TestFooter from '@/components/TestFooter'

const toNovel = (b: NovelMeta): Novel => ({
  slug: b.slug, title: b.title, author: b.author, total_chapters: b.total_chapters, genres: b.genres ?? [], cover_url: b.cover_url,
})

export default function TestBookmarksPage() {
  const { user, loading: authLoading } = useAuth()
  const [books, setBooks] = useState<NovelMeta[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (user) {
      fetch('/api/bookmarks').then(r => r.ok ? r.json() : { bookmarks: [] })
        .then(d => { setBooks(d.bookmarks ?? []); setMounted(true) })
        .catch(() => { setBooks(getBookmarks()); setMounted(true) })
    } else {
      setBooks(getBookmarks()); setMounted(true)
    }
  }, [user, authLoading])

  async function remove(novel: NovelMeta) {
    if (user) await serverToggleBookmark(novel); else toggleBookmark(novel)
    setBooks(prev => prev.filter(b => b.slug !== novel.slug))
  }

  return (
    <div className="tnl-root relative min-h-screen text-white" style={{ ['--v' as string]: '124,58,237' }}>
      <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: '#07060d' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(85% 50% at 50% -10%, rgba(var(--v),0.20) 0%, transparent 55%)' }} />
      </div>

      <TestHeader />

      <main className="relative z-10 mx-auto max-w-[1400px] px-4 pb-24 pt-8 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Your Library</h1>
            {mounted && books.length > 0 && (
              <p className="mt-1 text-sm text-white/50">
                {books.length} saved · {user ? 'synced to your account' : 'stored in this browser'}
              </p>
            )}
          </div>
          <Link href="/browse" className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:text-white">Browse more →</Link>
        </div>

        {!mounted ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
          </div>
        ) : books.length === 0 ? (
          <div className="tnl-panel flex flex-col items-center justify-center gap-4 py-24 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl" style={{ background: 'rgba(var(--v),0.15)' }}>🔖</span>
            <div>
              <p className="text-base font-bold">No bookmarks yet</p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-white/50">Tap the heart on any novel to save it here for quick access across devices.</p>
            </div>
            <Link href="/browse" className="mt-1 rounded-xl px-5 py-2.5 text-sm font-bold transition hover:brightness-110" style={{ background: 'rgb(var(--v))' }}>Browse novels</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {books.map(b => (
              <div key={b.slug} className="group relative">
                <Link href={`/novel/${b.slug}`} className="tnl-sheen block">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-xl ring-1 ring-white/10 transition group-hover:ring-[rgba(var(--v),0.6)]">
                    <Cover novel={toNovel(b)} className="h-full w-full" />
                    {b.total_chapters > 0 && <span className="absolute bottom-1.5 right-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white/85">{b.total_chapters.toLocaleString()} ch</span>}
                  </div>
                </Link>
                <Link href={`/novel/${b.slug}`} className="mt-1.5 block line-clamp-2 text-[13px] font-semibold leading-tight transition hover:text-[rgb(var(--v))]">{b.title}</Link>
                {b.author && <p className="mt-0.5 truncate text-[11px] text-white/45">{b.author}</p>}
                <button onClick={() => remove(b)} title="Remove bookmark"
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white/70 opacity-0 ring-1 ring-white/15 backdrop-blur transition group-hover:opacity-100 hover:bg-red-500 hover:text-white">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <TestFooter />
      <TestStyles />
    </div>
  )
}
