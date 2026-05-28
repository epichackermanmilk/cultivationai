-- ── user_bookmarks table ───────────────────────────────────────────────────
-- Run this in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS user_bookmarks (
  user_id        uuid        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  slug           text        NOT NULL,
  title          text        NOT NULL DEFAULT '',
  author         text        NOT NULL DEFAULT '',
  cover_url      text        NOT NULL DEFAULT '',
  genres         jsonb       NOT NULL DEFAULT '[]'::jsonb,
  total_chapters integer     NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, slug)
);

CREATE INDEX IF NOT EXISTS user_bookmarks_user
  ON user_bookmarks (user_id, created_at DESC);

ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookmarks_owner" ON user_bookmarks;
CREATE POLICY "bookmarks_owner" ON user_bookmarks
  FOR ALL USING (auth.uid() = user_id);
