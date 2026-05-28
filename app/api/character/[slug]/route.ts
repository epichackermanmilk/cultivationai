// GET /api/character/[slug]
// Returns featured and community character profiles for a novel.
//
// Featured: curated hand-written profiles (from lib/featured-characters.ts).
// Community: GPT-synthesised profiles cached in novel_characters.profiles.
//
// When community profiles don't exist yet, this call synthesises them from
// the first 25 indexed chunks and caches the result for all future visitors.

import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { getFeaturedCharacters, type CharacterProfile } from '@/lib/featured-characters'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

interface RouteContext { params: Promise<{ slug: string }> }

// Shape stored in / returned from the community profiles column
export interface CommunityProfile {
  name:              string
  speech_style:      string
  core_traits:       string[]
  motivation:        string
  key_relationships: { name: string; relation: string }[]
  featured?:         false
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { slug } = await params
  const sb = admin()

  // ── 1. Featured characters (hardcoded, instant) ──────────────────────────────
  const featured: CharacterProfile[] = getFeaturedCharacters(slug)

  // ── 2. Community profiles from cache ────────────────────────────────────────
  let community: CommunityProfile[] = []
  let needsSynthesis = true

  try {
    const { data: cached } = await sb
      .from('novel_characters')
      .select('profiles, characters')
      .eq('slug', slug)
      .maybeSingle()

    if (cached?.profiles && Array.isArray(cached.profiles) && cached.profiles.length > 0) {
      // Rich profiles already cached
      community = cached.profiles as CommunityProfile[]
      needsSynthesis = false
    } else if (cached?.characters && Array.isArray(cached.characters) && cached.characters.length > 0) {
      // Old-format: only names cached. We have the row but need to upgrade it.
      needsSynthesis = true
    }
  } catch { /* table may not exist yet */ }

  // ── 3. Synthesise community profiles if needed ──────────────────────────────
  if (needsSynthesis) {
    try {
      const { data: chunks } = await sb
        .from('novel_chunks')
        .select('text')
        .eq('slug', slug)
        .order('chapter_number', { ascending: true })
        .limit(25)

      if (chunks && chunks.length > 0) {
        const excerpt = chunks
          .map(c => c.text.slice(0, 500))
          .join('\n\n---\n\n')

        const completion = await openai.chat.completions.create({
          model:           'gpt-4o-mini',
          temperature:     0.2,
          max_tokens:      900,
          response_format: { type: 'json_object' },
          messages: [{
            role:    'user',
            content: `From these novel excerpts, identify the 6 most prominent characters and build personality profiles.
Protagonist first. Be specific to what the text actually shows — not generic traits.

Return ONLY valid JSON in this exact shape:
{
  "characters": [
    {
      "name": "Character Name",
      "speech_style": "One sentence: how they speak (tone, pacing, vocabulary choices)",
      "core_traits": ["trait1 — specific, not generic", "trait2", "trait3"],
      "motivation": "What drives them above all else, in one sentence",
      "key_relationships": [
        {"name": "PersonName", "relation": "their role and dynamic in one phrase"}
      ]
    }
  ]
}

Excerpts:
${excerpt}`,
          }],
        })

        const parsed = JSON.parse(completion.choices[0].message.content ?? '{}')
        if (Array.isArray(parsed.characters)) {
          const synthesised = (parsed.characters as unknown[])
            .filter((c): c is CommunityProfile =>
              typeof c === 'object' && c !== null &&
              typeof (c as Record<string, unknown>).name === 'string'
            )
            .slice(0, 6)
            .map(c => ({
              name:              c.name,
              speech_style:      typeof c.speech_style === 'string' ? c.speech_style : '',
              core_traits:       Array.isArray(c.core_traits) ? c.core_traits as string[] : [],
              motivation:        typeof c.motivation === 'string' ? c.motivation : '',
              key_relationships: Array.isArray(c.key_relationships) ? c.key_relationships as { name: string; relation: string }[] : [],
            }))

          community = synthesised

          // Cache profiles + backward-compat names array
          const names = synthesised.map(c => c.name)
          try {
            await sb
              .from('novel_characters')
              .upsert(
                { slug, characters: names, profiles: synthesised, updated_at: new Date().toISOString() },
                { onConflict: 'slug' },
              )
          } catch { /* non-fatal */ }
        }
      }
    } catch { /* synthesis failed — return what we have */ }
  }

  // Filter out community characters whose names overlap with featured ones
  const featuredNames = new Set(featured.map(f => f.name.toLowerCase()))
  const filteredCommunity = community.filter(c => !featuredNames.has(c.name.toLowerCase()))

  // All character names (for backward compat callers that only use `characters`)
  const allNames = [
    ...featured.map(f => f.name),
    ...filteredCommunity.map(c => c.name),
  ]

  return NextResponse.json({
    featured:   featured,
    community:  filteredCommunity,
    characters: allNames,   // backward compat
  })
}
