// GET /api/knowledge/[slug]
// Returns the extracted character roster for a novel (canonical names, aliases,
// affiliation, role, cultivation, one-line). Powers character discovery surfaces.

import { NextResponse } from 'next/server'
import { getNovelKnowledge } from '@/lib/knowledge'

interface RouteContext { params: Promise<{ slug: string }> }

export async function GET(_req: Request, { params }: RouteContext) {
  const { slug } = await params
  const kb = getNovelKnowledge(slug)
  if (!kb) return NextResponse.json({ slug, characters: [], character_count: 0 })
  return NextResponse.json(kb, {
    headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' },
  })
}
