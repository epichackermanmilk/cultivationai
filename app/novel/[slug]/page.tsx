import { listNovels } from '@/lib/vps'
import Chat from './Chat'
import CoverImage from './CoverImage'
import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'
import TokenWidget from '@/components/TokenWidget'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function NovelPage({ params }: Props) {
  const { slug } = await params

  let novel = null
  try {
    const novels = await listNovels()
    novel = novels.find(n => n.slug === slug) ?? null
  } catch {
    // VPS unreachable — fall through
  }

  const title  = novel?.title  ?? slug.replace(/-/g, ' ')
  const author = novel?.author ?? ''

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-[var(--nc-border)] px-4 py-3" style={{ background: 'var(--nc-bg)' }}>
        <Link href="/" className="text-zinc-400 hover:text-zinc-100 transition-colors text-sm">
          ← Back
        </Link>
        <div className="h-4 w-px bg-zinc-700" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold text-amber-400 capitalize">{title}</h1>
          {author && <p className="text-xs text-zinc-500">{author}</p>}
        </div>
        {novel && (
          <span className="shrink-0 text-xs text-zinc-600">
            {novel.total_chapters.toLocaleString()} chapters
          </span>
        )}
        <TokenWidget />
        <ThemeToggle />
      </header>

      {/* Side panel + Chat */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — always rendered; shows skeleton when novel is still being indexed */}
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-[var(--nc-border)] p-4 lg:block" style={{ background: 'var(--nc-bg2)' }}>
          {novel ? (
            <>
              <CoverImage src={novel.cover_url} alt={novel.title} />
              <h2 className="text-sm font-semibold text-zinc-100">{novel.title}</h2>
              <p className="mt-0.5 text-xs text-zinc-400">{novel.author}</p>
              {novel.genres.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {novel.genres.map(g => (
                    <span key={g} className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-amber-400">
                      {g}
                    </span>
                  ))}
                </div>
              )}
              {novel.description && (
                <p className="mt-3 text-xs leading-relaxed text-zinc-400 line-clamp-6">
                  {novel.description}
                </p>
              )}
              <div className="mt-4 rounded-lg bg-zinc-800 p-3">
                <p className="text-xs text-zinc-400">
                  <span className="text-zinc-200 font-medium">{novel.total_chapters.toLocaleString()}</span> chapters available
                </p>
              </div>
            </>
          ) : (
            /* Novel is being re-indexed by the scraper */
            <div className="flex flex-col gap-3">
              <div className="aspect-[3/4] w-full rounded-lg bg-zinc-800 animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-zinc-800 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-zinc-800 animate-pulse" />
              <p className="mt-4 text-xs text-zinc-500 leading-relaxed">
                This novel is currently being indexed by our scraper. Details will appear here shortly — you can still unlock and chat below.
              </p>
            </div>
          )}
        </aside>

        {/* Chat */}
        <Chat slug={slug} title={title} author={author} />
      </div>
    </div>
  )
}
