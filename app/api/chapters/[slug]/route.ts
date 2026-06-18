// GET /api/chapters/[slug]
// Chapter list (number + title) sourced from the scraped novel JSON on the VPS.
// This needs no embeddings, so every scraped novel gets a chapter list (unlike the
// old Qdrant path, which only covered curated/indexed novels). Cached in-process 1h.

import { NextResponse } from 'next/server'
import { getChapterList } from '@/lib/vps'

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
    const { chapters } = await getChapterList(slug) // [{ chapter_number, title }]
    const mapped = chapters.map(c => ({ chapter_number: c.chapter_number, chapter_title: c.title }))
    const data = { slug, count: mapped.length, chapters: mapped }
    cache.set(slug, { data, ts: Date.now() })
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, s-maxage=3600', 'X-Cache': 'MISS' } })
  } catch {
    return NextResponse.json({ slug, count: 0, chapters: [] })
  }
}
