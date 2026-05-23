'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getRecent, type RecentEntry } from '@/lib/bookmarks'

export default function RecentSection() {
  const [recent, setRecent] = useState<RecentEntry[]>([])

  useEffect(() => {
    setRecent(getRecent())
  }, [])

  if (recent.length === 0) return null

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--nc-text2)' }}>
        Recently visited
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
        {recent.map(n => (
          <Link
            key={n.slug}
            href={`/novel/${n.slug}`}
            className="group shrink-0 w-24 transition"
          >
            <div
              className="relative h-32 w-24 overflow-hidden rounded-lg border border-[var(--nc-border)] transition group-hover:border-amber-500/50"
              style={{ background: 'var(--nc-bg3)' }}
            >
              {n.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={n.cover_url}
                  alt={n.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center p-2">
                  <span className="text-center text-xs leading-tight" style={{ color: 'var(--nc-text2)' }}>
                    {n.title}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
            <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-tight group-hover:text-amber-400 transition-colors" style={{ color: 'var(--nc-text)' }}>
              {n.title}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
