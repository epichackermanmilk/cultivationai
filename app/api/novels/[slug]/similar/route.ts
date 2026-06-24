// GET /api/novels/[slug]/similar — semantic "more like this" via the novel_meta
// embedding collection (Qdrant). Returns [] if the novel isn't embedded yet; the
// detail page then falls back to genre-overlap matching.

import { NextResponse } from 'next/server'
import { similarNovels } from '@/lib/qdrant'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  try {
    const similar = await similarNovels(slug, 6)
    return NextResponse.json({ similar }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch {
    return NextResponse.json({ similar: [] })
  }
}
