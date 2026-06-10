// GET /api/character/[slug]
// Returns curated character profiles for a novel.
// Auto-synthesis removed — quality over quantity. Users can request characters
// via the feedback widget (character_request type).

import { NextResponse } from 'next/server'
import { getFeaturedCharacters } from '@/lib/featured-characters'

interface RouteContext { params: Promise<{ slug: string }> }

export async function GET(_req: Request, { params }: RouteContext) {
  const { slug } = await params
  const featured = getFeaturedCharacters(slug)

  return NextResponse.json({
    featured,
    community:  [],
    characters: featured.map(f => f.name),
  })
}
