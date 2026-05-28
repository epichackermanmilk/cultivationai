// GET /api/character/[slug]
// Returns a list of likely main characters for a novel, extracted from its
// embedded chunks via a cheap GPT-4o-mini call. Results are cached in Supabase
// so each novel is only extracted once.

import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

interface RouteContext { params: Promise<{ slug: string }> }

export async function GET(_req: Request, { params }: RouteContext) {
  const { slug } = await params
  const sb = admin()

  // ── Check cache ─────────────────────────────────────────────────────────────
  // We reuse the novel_meta table if it exists, otherwise fall back gracefully
  try {
    const { data: cached } = await sb
      .from('novel_characters')
      .select('characters')
      .eq('slug', slug)
      .maybeSingle()

    if (cached?.characters) {
      return NextResponse.json({ characters: cached.characters })
    }
  } catch { /* table may not exist — continue */ }

  // ── Pull top chunks for this novel ──────────────────────────────────────────
  // Use the highest-frequency name chunks: order by chapter ascending so we
  // get early story content where characters are introduced
  let chunks: { text: string }[] = []
  try {
    const { data } = await sb
      .from('novel_chunks')
      .select('text')
      .eq('slug', slug)
      .order('chapter_number', { ascending: true })
      .limit(15)
    chunks = data ?? []
  } catch {
    return NextResponse.json({ characters: [] })
  }

  if (chunks.length === 0) {
    return NextResponse.json({ characters: [] })
  }

  // ── Ask GPT to extract character names ──────────────────────────────────────
  const excerpt = chunks.map(c => c.text.slice(0, 400)).join('\n\n---\n\n')

  let characters: string[] = []
  try {
    const completion = await openai.chat.completions.create({
      model:           'gpt-4o-mini',
      temperature:     0.2,
      max_tokens:      150,
      response_format: { type: 'json_object' },
      messages: [{
        role:    'user',
        content: `From these novel excerpts, list the 6 most prominent named characters (protagonist first).
Return ONLY valid JSON: {"characters":["Name1","Name2","Name3",...]}
No explanations. Names only — no titles like "the" or "young master".

Excerpts:
${excerpt}`,
      }],
    })
    const parsed = JSON.parse(completion.choices[0].message.content ?? '{}')
    if (Array.isArray(parsed.characters)) {
      characters = (parsed.characters as unknown[])
        .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
        .slice(0, 6)
    }
  } catch {
    return NextResponse.json({ characters: [] })
  }

  // ── Cache result ─────────────────────────────────────────────────────────────
  try {
    await sb
      .from('novel_characters')
      .upsert({ slug, characters, updated_at: new Date().toISOString() }, { onConflict: 'slug' })
  } catch { /* table may not exist — that's fine */ }

  return NextResponse.json({ characters })
}
