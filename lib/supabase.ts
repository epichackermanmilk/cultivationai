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
