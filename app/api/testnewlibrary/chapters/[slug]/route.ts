// GET /api/testnewlibrary/chapters/[slug]
// Real chapter list (number + title) sourced from the indexed chapters in Qdrant.
// Cached in-process for an hour (chapters change slowly).

import { NextResponse } from 'next/server'
import { scrollTitles } from '@/lib/qdrant'

interface RouteContext { params: Promise<{ slug: string }> }
interface Cache { data: unknown; ts: number }
const cache = new Map<string, Cache>()
const TTL = 60 * 60_000

export async function GET(_req: Request, { params }: RouteContext) {
  const { slug } = await params
  const hit = cache.get(slug)
  if (hit && Date.now() - hit.ts < TTL) {
    return NextResponse.json(hit.data, { headers: { 'X-Cache': 'HIT' } })
  }
  try {
    const titles = await scrollTitles(slug) // [{ chapter_number, chapter_title }]
    titles.sort((a, b) => a.chapter_number - b.chapter_number)
    const data = { slug, count: titles.length, chapters: titles }
    cache.set(slug, { data, ts: Date.now() })
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, s-maxage=3600', 'X-Cache': 'MISS' } })
  } catch {
    return NextResponse.json({ slug, count: 0, chapters: [] })
  }
}
