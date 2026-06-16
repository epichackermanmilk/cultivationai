// GET /api/knowledge/[slug]
// Structured knowledge for a novel: character roster + power system + key facts +
// protagonist. Powers the Codex Insight panel and character discovery surfaces.

import { NextResponse } from 'next/server'
import { getNovelKnowledge, getNovelLore, getKeyFacts, getProtagonist } from '@/lib/knowledge'

interface RouteContext { params: Promise<{ slug: string }> }

export async function GET(_req: Request, { params }: RouteContext) {
  const { slug } = await params
  const kb = getNovelKnowledge(slug)
  const lore = getNovelLore(slug)
  return NextResponse.json({
    slug,
    characters:    kb?.characters ?? [],
    character_count: kb?.character_count ?? 0,
    power_system:  lore?.power_system ?? null,
    glossary:      lore?.glossary ?? [],
    key_facts:     getKeyFacts(slug),
    protagonist:   getProtagonist(slug),
  }, { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' } })
}
