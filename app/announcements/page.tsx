'use client'

// /announcements — the full announcement feed (the homepage shows the latest few;
// "View All" lands here). Pulls from /api/announcements with a static fallback.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import TestHeader from '@/components/TestHeader'
import TestFooter from '@/components/TestFooter'
import { TestStyles } from '@/components/TestUI'

interface Announcement { title: string; date: string; body: string; pinned?: boolean }
const FALLBACK: Announcement[] = [
  { title: 'Welcome to the new NovelCodex', date: 'Jun 16, 2026', body: 'A faster, cleaner library with a cinematic reading hub. Tell us what you think.' },
  { title: 'Read any novel free', date: 'Jun 17, 2026', body: 'Every scraped novel is now readable on-site. The latest chapters unlock with a subscription or tokens.' },
  { title: 'More novels indexing weekly', date: 'Jun 2, 2026', body: 'We are hand-indexing chapters for new titles continuously. New worlds unlock every week.' },
]

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>(FALLBACK)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/announcements')
      .then(r => r.json())
      .then((d: { announcements?: { title: string; body: string; created_at: string; pinned?: boolean }[] }) => {
        const list = d.announcements ?? []
        if (list.length) setItems(list.map(a => ({
          title: a.title, body: a.body, pinned: a.pinned,
          date: new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        })))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="tnl-root relative min-h-screen text-white" style={{ ['--v' as string]: '124,58,237' }}>
      <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: '#07060d' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(85% 55% at 50% -10%, rgba(var(--v),0.22) 0%, transparent 55%)' }} />
      </div>

      <TestHeader />

      <main className="relative z-10 mx-auto max-w-3xl px-4 pb-24 pt-12 sm:px-6">
        <div className="mb-2 flex items-center gap-3">
          <Link href="/" className="text-sm text-white/45 transition hover:text-white">‹ Home</Link>
        </div>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Announcements</h1>
        <p className="mt-2 text-sm text-white/55">Updates, new features, and what&apos;s changing across NovelCodex.</p>

        <div className="mt-7 space-y-3">
          {loading && items === FALLBACK ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="tnl-panel h-24 animate-pulse rounded-2xl" />)
          ) : items.length === 0 ? (
            <p className="tnl-panel rounded-2xl p-8 text-center text-sm text-white/40">No announcements yet.</p>
          ) : (
            items.map((a, i) => (
              <article key={`${a.title}-${i}`} className="tnl-panel rounded-2xl p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black" style={{ background: 'rgba(var(--v),0.85)' }}>NC</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-base font-bold">{a.title}</h2>
                      {a.pinned && <span className="rounded-md bg-[rgba(var(--v),0.2)] px-1.5 py-0.5 text-[10px] font-bold" style={{ color: 'rgb(var(--v))' }}>PINNED</span>}
                    </div>
                    <p className="text-[11px] uppercase tracking-wider text-white/35">{a.date}</p>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/70">{a.body}</p>
              </article>
            ))
          )}
        </div>
      </main>

      <TestFooter />
      <TestStyles />
    </div>
  )
}
