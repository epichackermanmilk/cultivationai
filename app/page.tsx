'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'

interface Novel {
  slug: string
  title: string
  author: string
  total_chapters: number
  genres: string[]
  cover_url: string
  description: string
}

export default function Home() {
  const [novels, setNovels]   = useState<Novel[]>([])
  const [query, setQuery]     = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/novels')
      .then(async r => {
        const data = await r.json()
        setNovels(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return novels
    const q = query.toLowerCase()
    return novels.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.author.toLowerCase().includes(q) ||
      n.genres.some(g => g.toLowerCase().includes(q))
    )
  }, [novels, query])

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-amber-400">CultivationAI</h1>
            <p className="text-xs text-zinc-500">Chat with your favourite novels</p>
          </div>
          <span className="text-sm text-zinc-500">{novels.length.toLocaleString()} novels</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Search by title, author, or genre…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg bg-zinc-800 aspect-[3/4]" />
            ))}
          </div>
        ) : (
          <>
            {query && (
              <p className="mb-4 text-sm text-zinc-400">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
              </p>
            )}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filtered.map(novel => (
                <NovelCard key={novel.slug} novel={novel} />
              ))}
            </div>
            {filtered.length === 0 && (
              <p className="py-20 text-center text-zinc-500">No novels found.</p>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function NovelCard({ novel }: { novel: Novel }) {
  const [imgErr, setImgErr] = useState(false)

  return (
    <Link href={`/novel/${novel.slug}`} className="group">
      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 transition-all duration-200 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-900/20">
        {/* Cover */}
        <div className="relative aspect-[3/4] bg-zinc-800 overflow-hidden">
          {novel.cover_url && !imgErr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={novel.cover_url}
              alt={novel.title}
              onError={() => setImgErr(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 p-3">
              <span className="text-center text-xs text-zinc-400 font-medium leading-tight">
                {novel.title}
              </span>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/70 to-transparent" />
          <span className="absolute bottom-1.5 right-2 text-xs font-medium text-zinc-300">
            {novel.total_chapters.toLocaleString()} ch
          </span>
        </div>
        {/* Info */}
        <div className="p-2">
          <p className="line-clamp-2 text-xs font-semibold leading-tight text-zinc-100 group-hover:text-amber-400 transition-colors">
            {novel.title}
          </p>
          {novel.author && (
            <p className="mt-0.5 truncate text-xs text-zinc-500">{novel.author}</p>
          )}
          {novel.genres.length > 0 && (
            <p className="mt-1 truncate text-xs text-amber-600/80">{novel.genres[0]}</p>
          )}
        </div>
      </div>
    </Link>
  )
}
