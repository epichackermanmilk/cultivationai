import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getNovelMeta } from '@/lib/vps'
import DetailClient from './DetailClient'

interface Props { params: Promise<{ slug: string }> }

// Per-novel SEO metadata (carried over from the old novel page).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const novel = await getNovelMeta(slug)
    if (!novel) return { title: 'Novel not found', robots: { index: false } }
    const desc = novel.description
      ? novel.description.slice(0, 155) + (novel.description.length > 155 ? '…' : '')
      : `Read ${novel.title} on NovelCodex. ${(novel.total_chapters ?? 0).toLocaleString()} chapters.`
    return {
      title: novel.title,
      description: desc,
      openGraph: { title: novel.title, description: desc, type: 'book', url: `https://novelcodex.org/novel/${slug}`, images: novel.cover_url ? [{ url: novel.cover_url, width: 400, height: 600 }] : [] },
      twitter: { card: 'summary_large_image', title: novel.title, description: desc, images: novel.cover_url ? [novel.cover_url] : [] },
      alternates: { canonical: `https://novelcodex.org/novel/${slug}` },
    }
  } catch { return { title: 'NovelCodex' } }
}

export default async function NovelDetailPage({ params }: Props) {
  const { slug } = await params
  let meta = null
  try { meta = await getNovelMeta(slug) } catch { /* VPS unreachable */ }

  // Real 404 for missing/removed novels (avoids Google "soft 404").
  if (!meta) notFound()

  return <DetailClient meta={{
    slug:           meta.slug,
    title:          meta.title,
    author:         meta.author ?? '',
    total_chapters: meta.total_chapters ?? 0,
    genres:         Array.isArray(meta.genres) ? meta.genres : [],
    cover_url:      meta.cover_url ?? '',
    description:    (meta as { description?: string }).description ?? '',
  }} />
}
