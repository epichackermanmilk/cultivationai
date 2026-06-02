import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ── Singleton client (connection pool) ───────────────────────────────────────
// Re-using one client per process avoids TCP overhead on every API request.
// The service key bypasses RLS — only used in server-side code (api/ routes).
let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
  }
  return _client
}

// ── Query helpers ─────────────────────────────────────────────────────────────

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
  threshold = 0.2,
): Promise<{ text: string; chapter_number: number; chapter_title: string; similarity: number }[]> {
  const sb = getSupabase()
  const { data, error } = await sb.rpc('match_chunks', {
    query_embedding:  embedding,
    novel_slug:       slug,
    match_count:      count,
    match_threshold:  threshold,
  })
  if (error) throw new Error(error.message)
  return data ?? []
}
