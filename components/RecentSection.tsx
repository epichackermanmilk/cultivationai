'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getRecent, removeRecent, type RecentEntry } from '@/lib/bookmarks'

export default function RecentSection() {
  const [recent, setRecent] = useState<RecentEntry[]>([])

  useEffect(() => {
    setRecent(getRecent())
  }, [])

  function dismiss(e: React.MouseEvent, slug: string) {
    e.preventDefault()
    e.stopPropagation()
    removeRecent(slug)
    setRecent(prev => prev.filter(r => r.slug !== slug))
  }

  if (recent.length === 0) return null

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--nc-text2)' }}>
        Recently visited
      </h2>
      {/* pt-3 -mt-3 give headroom above cards so the dismiss button (-top-1.5) isn't clipped
          by the overflow-x-auto context, which implicitly sets overflow-y:auto too */}
      <div className="flex gap-3 overflow-x-auto pb-2 pt-3 -mt-3 pr-2" style={{ scrollbarWidth: 'thin' }}>
        {recent.map(n => (
          <div key={n.slug} className="group relative shrink-0 w-24">
            <Link href={`/novel/${n.slug}`} className="block transition">
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

            {/* Dismiss button */}
            <button
              onClick={e => dismiss(e, n.slug)}
              aria-label={`Remove ${n.title} from recently visited`}
              className="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 hover:border-zinc-400 hover:text-zinc-100 hover:bg-zinc-700"
            >
              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
