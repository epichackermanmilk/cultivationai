import type { Metadata } from 'next'
import { createClient }       from '@supabase/supabase-js'
import { listNovels }         from '@/lib/vps'
import Chat          from './Chat'
import CoverImage    from './CoverImage'
import VisitTracker  from './VisitTracker'
import Link          from 'next/link'
import TokenWidget          from '@/components/TokenWidget'
import FeedbackWidget       from '@/components/FeedbackWidget'
import DescriptionExpander  from '@/components/DescriptionExpander'

interface Props {
  params: Promise<{ slug: string }>
}

// ── SEO metadata per novel ────────────────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const novels = await listNovels()
    const novel  = novels.find(n => n.slug === slug)
    if (!novel) return { title: 'NovelCodex' }

    const desc = novel.description
      ? novel.description.slice(0, 155) + (novel.description.length > 155 ? '…' : '')
      : `Read and chat about ${novel.title} on NovelCodex. ${novel.total_chapters.toLocaleString()} chapters indexed.`

    return {
      title:       `${novel.title} — NovelCodex`,
      description: desc,
      openGraph: {
        title:       novel.title,
        description: desc,
        images:      novel.cover_url ? [{ url: novel.cover_url, width: 400, height: 600 }] : [],
        type:        'book',
        url:         `https://novelcodex.org/novel/${slug}`,
      },
      twitter: {
        card:        'summary_large_image',
        title:       novel.title,
        description: desc,
        images:      novel.cover_url ? [novel.cover_url] : [],
      },
      alternates: { canonical: `https://novelcodex.org/novel/${slug}` },
    }
  } catch {
    return { title: 'NovelCodex' }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function NovelPage({ params }: Props) {
  const { slug } = await params

  let novels: Awaited<ReturnType<typeof listNovels>> = []
  let novel = null
  try {
    novels = await listNovels()
    novel = novels.find(n => n.slug === slug) ?? null
  } catch {
    // VPS unreachable — fall through
  }

  const title  = novel?.title  ?? slug.replace(/-/g, ' ')
  const author = novel?.author ?? ''

  // ── Character cast (top 8 names from DB) ────────────────────────────────────
  let topCharacters: string[] = []
  try {
    const { data } = await sb()
      .from('novel_characters')
      .select('characters')
      .eq('slug', slug)
      .maybeSingle()
    topCharacters = ((data?.characters as string[]) ?? []).slice(0, 8)
  } catch { /* non-fatal */ }

  // ── Related novels (up to 3, same genre, shuffled) ──────────────────────────
  const related = novel
    ? novels
        .filter(n => n.slug !== slug && n.genres.some(g => novel!.genres.includes(g)))
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
    : []

  // ── JSON-LD structured data ──────────────────────────────────────────────────
  const jsonLd = novel ? {
    '@context': 'https://schema.org',
    '@type':    'Book',
    name:       novel.title,
    author:     { '@type': 'Person', name: novel.author },
    description: novel.description ?? '',
    genre:      novel.genres,
    url:        `https://novelcodex.org/novel/${slug}`,
    image:      novel.cover_url ?? undefined,
    numberOfPages: novel.total_chapters,
  } : null

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>

      {/* JSON-LD */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-[var(--nc-border)] px-4 py-3" style={{ background: 'var(--nc-bg)' }}>
        <Link href="/library" className="text-zinc-400 hover:text-zinc-100 transition-colors text-sm">
          ← Back
        </Link>
        <div className="h-4 w-px bg-zinc-700" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold text-amber-400 capitalize">{title}</h1>
          {author && <p className="text-xs text-zinc-500">{author}</p>}
        </div>
        {novel && (
          <span className="shrink-0 text-xs text-zinc-600">
            {novel.total_chapters.toLocaleString()} ch
          </span>
        )}
        <TokenWidget />
      </header>

      {/* Mobile info strip — genres + synopsis + characters, hidden on lg */}
      {novel && (
        <div className="lg:hidden shrink-0 border-b border-[var(--nc-border)]" style={{ background: 'var(--nc-bg2)' }}>
          <div className="flex items-center gap-2 overflow-x-auto px-4 py-2 scrollbar-none">
            {novel.genres.slice(0, 4).map(g => (
              <span key={g} className="shrink-0 rounded bg-zinc-800 px-2 py-0.5 text-xs text-amber-400">{g}</span>
            ))}
            <span className="shrink-0 text-xs text-zinc-500 ml-auto">{novel.total_chapters.toLocaleString()} ch</span>
          </div>
          {novel.description && (
            <div className="px-4 pb-2">
              <DescriptionExpander text={novel.description} lines={2} />
            </div>
          )}
          {topCharacters.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto px-4 pb-3 scrollbar-none">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Cast:</span>
              {topCharacters.slice(0, 5).map(c => (
                <span key={c} className="shrink-0 rounded-full border border-zinc-700 bg-zinc-800/60 px-2.5 py-0.5 text-xs text-zinc-300">{c}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Side panel + Chat */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-[var(--nc-border)] lg:block" style={{ background: 'var(--nc-bg2)' }}>
          {novel ? (
            <div className="p-4 space-y-4">
              <CoverImage src={novel.cover_url} alt={novel.title} />
              <div>
                <h2 className="text-sm font-semibold text-zinc-100 leading-snug">{novel.title}</h2>
                <p className="mt-0.5 text-xs text-zinc-400">{novel.author}</p>
              </div>

              {/* Genre tags */}
              {novel.genres.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {novel.genres.map(g => (
                    <span key={g} className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-amber-400">{g}</span>
                  ))}
                </div>
              )}

              {/* Synopsis */}
              {novel.description && (
                <DescriptionExpander text={novel.description} lines={4} />
              )}

              {/* Chapter count */}
              <div className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 px-3 py-2">
                <p className="text-xs text-zinc-400">
                  <span className="text-zinc-200 font-semibold">{novel.total_chapters.toLocaleString()}</span>
                  <span className="ml-1">chapters indexed</span>
                </p>
              </div>

              {/* Character cast */}
              {topCharacters.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Characters</p>
                  <div className="flex flex-wrap gap-1.5">
                    {topCharacters.map(c => (
                      <span key={c}
                        className="rounded-full border border-zinc-700 bg-zinc-800/50 px-2.5 py-0.5 text-xs text-zinc-300 hover:border-amber-500/40 hover:text-amber-300 transition cursor-default">
                        {c}
                      </span>
                    ))}
                  </div>
                  <Link href={`/characters?q=${encodeURIComponent(novel.title)}`}
                    className="mt-2 block text-[10px] text-zinc-600 hover:text-amber-400 transition">
                    View full cast →
                  </Link>
                </div>
              )}

              {/* Related novels */}
              {related.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">You Might Like</p>
                  <div className="space-y-2">
                    {related.map(r => (
                      <Link key={r.slug} href={`/novel/${r.slug}`}
                        className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-800/30 p-2 hover:border-zinc-700 hover:bg-zinc-800/60 transition group">
                        {r.cover_url ? (
                          <img src={r.cover_url} alt="" className="h-10 w-7 rounded object-cover shrink-0" />
                        ) : (
                          <div className="h-10 w-7 rounded bg-zinc-700 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-zinc-300 group-hover:text-amber-300 transition leading-tight">{r.title}</p>
                          <p className="text-[10px] text-zinc-600 mt-0.5">{r.author}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 flex flex-col gap-3">
              <div className="aspect-[3/4] w-full rounded-lg bg-zinc-800 animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-zinc-800 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-zinc-800 animate-pulse" />
              <p className="mt-4 text-xs text-zinc-500 leading-relaxed">
                This novel is currently being indexed. Details will appear here shortly — you can still unlock and chat below.
              </p>
            </div>
          )}
        </aside>

        {/* Chat */}
        <Chat slug={slug} title={title} author={author} />
      </div>

      {novel && (
        <VisitTracker novel={{
          slug,
          title:          novel.title,
          author:         novel.author,
          cover_url:      novel.cover_url,
          genres:         novel.genres,
          total_chapters: novel.total_chapters,
        }} />
      )}
      <FeedbackWidget />
    </div>
  )
}
