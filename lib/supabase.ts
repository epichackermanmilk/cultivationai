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
// Chunk storage/retrieval now lives in Qdrant on the VPS (off Supabase, which
// only handles auth/profiles). These re-export the Qdrant implementations so
// every existing caller switches over without changes.

export { isNovelEmbedded, matchChunks } from './qdrant'

// ── L2 chapter summaries ──────────────────────────────────────────────────────
// Dense, clean, chronological per-chapter records (in Supabase — tiny table).
// Used for ordered / early-story / timeline / progression questions that raw
// chunk retrieval answers poorly.
export interface ChapterSummary { chapter_number: number; chapter_title: string; summary: string }

export async function getChapterSummaries(slug: string, fromCh = 1, toCh = 99999, limit = 120): Promise<ChapterSummary[]> {
  try {
    const sb = getSupabase()
    const { data } = await sb
      .from('chapter_summaries')
      .select('chapter_number, chapter_title, summary')
      .eq('slug', slug)
      .gte('chapter_number', fromCh)
      .lte('chapter_number', toCh)
      .order('chapter_number', { ascending: true })
      .limit(limit)
    return (data ?? []) as ChapterSummary[]
  } catch { return [] }
}
