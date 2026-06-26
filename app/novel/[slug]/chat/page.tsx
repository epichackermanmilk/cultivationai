// /testnovel/[slug] — themed chat experience (Ask the Book / Character Chat) for
// curated novels. Server component: loads novel meta, renders a glass shell + the
// purple-themed TestChat. Chat is reserved for curated novels to keep embed costs
// down; discovery/reading happen on /.

import Link from 'next/link'
import { getNovelMeta } from '@/lib/vps'
import { coverSrc } from '@/lib/cover'
import TestChat from '@/components/TestChat'
import ChatViewport from '@/components/ChatViewport'

interface Props { params: Promise<{ slug: string }> }

export default async function TestNovelChat({ params }: Props) {
  const { slug } = await params
  let meta = null
  try { meta = await getNovelMeta(slug) } catch { /* VPS unreachable */ }

  const title = meta?.title ?? slug.replace(/-/g, ' ')
  const author = meta?.author ?? ''

  return (
    <div className="relative flex flex-col overflow-hidden text-white" style={{ height: 'var(--chat-vh, 100dvh)', ['--v' as string]: '124,58,237' }}>
      <ChatViewport />
      {/* Living background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" style={{ background: '#07060d' }}>
        {meta?.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverSrc(meta.cover_url)} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" style={{ filter: 'blur(70px) saturate(1.3)', transform: 'scale(1.3)', opacity: 0.28 }} />
        )}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 70% at 50% -10%, rgba(var(--v),0.4) 0%, transparent 55%), linear-gradient(180deg, rgba(7,6,13,0.45) 0%, #07060d 75%)' }} />
      </div>

      {/* Top bar */}
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3" style={{ background: 'rgba(10,8,18,0.6)', backdropFilter: 'blur(16px)' }}>
        <Link href="/characters" className="shrink-0 text-sm text-white/60 transition hover:text-white">← Characters</Link>
        <div className="h-4 w-px bg-white/15" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold" style={{ color: 'rgb(var(--v))' }}>{title}</h1>
          {author && <p className="text-xs text-white/45">{author}</p>}
        </div>
        <Link href={`/novel/${slug}`} className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/75 transition hover:text-white">View novel</Link>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-white/10 p-4 lg:block" style={{ background: 'rgba(18,15,30,0.4)' }}>
          {meta ? (
            <div className="space-y-4">
              <div className="aspect-[3/4] overflow-hidden rounded-xl ring-1 ring-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverSrc(meta.cover_url)} alt={meta.title} className="h-full w-full object-cover" />
              </div>
              <div>
                <h2 className="text-sm font-bold leading-snug">{meta.title}</h2>
                <p className="mt-0.5 text-xs text-white/45">{meta.author}</p>
              </div>
              {(meta.genres ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {meta.genres.map(g => <span key={g} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/65">{g}</span>)}
                </div>
              )}
              {meta.description && <p className="text-xs leading-relaxed text-white/55 line-clamp-[12]">{meta.description}</p>}
            </div>
          ) : (
            <p className="text-xs text-white/40">Loading novel details…</p>
          )}
        </aside>

        {/* Chat */}
        <TestChat slug={slug} title={title} author={author} />
      </div>
    </div>
  )
}
