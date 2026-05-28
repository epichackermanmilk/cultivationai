-- ── Novel characters cache ────────────────────────────────────────────────────
-- Stores GPT-extracted character lists per novel so we only pay for extraction once.
-- Run this in the Supabase SQL Editor (once).

CREATE TABLE IF NOT EXISTS novel_characters (
  slug        text PRIMARY KEY,
  characters  jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at  timestamptz DEFAULT now()
);

-- No RLS needed — read-only public data, written only by server-side admin client
