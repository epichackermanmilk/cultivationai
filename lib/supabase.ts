import { createClient } from '@supabase/supabase-js'

export function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  )
}

export async function isNovelEmbedded(slug: string): Promise<boolean> {
  const sb = getSupabase()
  const { data } = await sb
    .from('novels')
    .select('is_embedded')
    .eq('slug', slug)
    .maybeSingle()
  return data?.is_embedded === true
}

export async function matchChunks(
  embedding: number[],
  slug: string,
  count = 6,
): Promise<{ text: string; chapter_number: number; chapter_title: string; similarity: number }[]> {
  const sb = getSupabase()
  const { data, error } = await sb.rpc('match_chunks', {
    query_embedding:  embedding,
    novel_slug:       slug,
    match_count:      count,
    match_threshold:  0.2,
  })
  if (error) throw new Error(error.message)
  return data ?? []
}
