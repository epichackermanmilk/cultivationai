-- ── Extend novel_characters with rich profile data ────────────────────────────
-- Run in Supabase SQL editor. Safe — only adds a column, no data loss.

ALTER TABLE novel_characters
  ADD COLUMN IF NOT EXISTS profiles jsonb NOT NULL DEFAULT '[]'::jsonb;
