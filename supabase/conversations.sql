-- ── Conversations: chat history per user per novel ────────────────────────────
-- Run this in the Supabase SQL Editor (once).
-- Requires: profiles table already exists.

CREATE TABLE IF NOT EXISTS conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  slug        text NOT NULL,
  novel_title text NOT NULL DEFAULT '',
  messages    jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at  timestamptz DEFAULT now(),
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, slug)
);

-- Fast lookup by user (list all conversations, most-recent first)
CREATE INDEX IF NOT EXISTS conversations_user_updated
  ON conversations (user_id, updated_at DESC);

-- RLS: users can only read/write their own rows
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_owner" ON conversations
  FOR ALL USING (auth.uid() = user_id);
