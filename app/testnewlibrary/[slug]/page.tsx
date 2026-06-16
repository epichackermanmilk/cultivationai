import { getNovelMeta } from '@/lib/vps'
import DetailClient from './DetailClient'
import Link from 'next/link'

interface Props { params: Promise<{ slug: string }> }

export default async function TestNovelDetail({ params }: Props) {
  const { slug } = await params
  let meta = null
  try { meta = await getNovelMeta(slug) } catch { /* VPS unreachable */ }

  if (!meta) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#07060d] text-white">
        <p className="text-lg text-white/70">Novel not found.</p>
        <Link href="/testnewlibrary" className="rounded-xl px-4 py-2 text-sm font-semibold" style={{ background: 'rgb(124,58,237)' }}>← Back to library</Link>
      </div>
    )
  }

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
