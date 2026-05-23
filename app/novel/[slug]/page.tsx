import { listNovels } from '@/lib/vps'
import Chat from './Chat'
import Link from 'next/link'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function NovelPage({ params }: Props) {
  const { slug } = await params

  // Fetch novel list and find this novel's metadata
  let novel = null
  try {
    const novels = await listNovels()
    novel = novels.find(n => n.slug === slug) ?? null
  } catch {
    // fall through to slug-based display
  }

  const title  = novel?.title  ?? slug.replace(/-/g, ' ')
  const author = novel?.author ?? 'Unknown'

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-4 py-3">
        <Link href="/" className="text-zinc-400 hover:text-zinc-100 transition-colors text-sm">
          ← Back
        </Link>
        <div className="h-4 w-px bg-zinc-700" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold text-amber-400">{title}</h1>
          {author && <p className="text-xs text-zinc-500">{author}</p>}
        </div>
        {novel && (
          <span className="shrink-0 text-xs text-zinc-600">
            {novel.total_chapters.toLocaleString()} chapters
          </span>
        )}
      </header>

      {/* Side panel + Chat */}
      <div className="flex flex-1 overflow-hidden">
        {/* Novel info sidebar */}
        {novel && (
          <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-900 p-4 lg:block">
            {novel.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={novel.cover_url}
                alt={novel.title}
                className="mb-4 w-full rounded-lg object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
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
          </aside>
        )}

        {/* Chat */}
        <Chat slug={slug} title={title} author={author} />
      </div>
    </div>
  )
}
