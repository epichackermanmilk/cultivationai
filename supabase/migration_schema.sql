-- ============================================================================
-- NovelCodex — full schema for a FRESH Supabase project.
-- Vectors/chunks now live in Qdrant on the VPS, so NO chunks table or vector
-- RPCs here. This project holds only auth + small app tables.
-- Apply once against the new project (psql via the session pooler).
-- ============================================================================

-- ── profiles (linked to auth.users) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                           uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                        text        NOT NULL,
  tokens                       integer     NOT NULL DEFAULT 100,
  username                     text,
  age                          integer     CHECK (age >= 13 AND age <= 120),
  onboarding_bonus_claimed     boolean     NOT NULL DEFAULT false,
  created_at                   timestamptz NOT NULL DEFAULT now(),
  -- monetization / account state
  tokens_ever_purchased        integer     NOT NULL DEFAULT 0,
  ads_disabled                 boolean     NOT NULL DEFAULT false,   -- one-time ad-free purchase or granted
  subscription_active          boolean     NOT NULL DEFAULT false,   -- active subscriber (cleared on cancel)
  subscription_tier            text,                                 -- e.g. plus / pro (null = none)
  -- discord linking
  discord_user_id              text,
  discord_verified             boolean     NOT NULL DEFAULT false,
  discord_link_code            text,
  discord_link_code_expires_at timestamptz,
  discord_link_pending_id      text
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE INDEX IF NOT EXISTS profiles_id_idx ON public.profiles (id);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx ON public.profiles (lower(username)) WHERE username IS NOT NULL;

-- Auto-create a profile row on every new signup (email OR Google OAuth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (new.id, new.email) ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── conversations (chat history per user per novel) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  slug        text NOT NULL,
  novel_title text NOT NULL DEFAULT '',
  messages    jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at  timestamptz DEFAULT now(),
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, slug)
);
CREATE INDEX IF NOT EXISTS conversations_user_updated ON public.conversations (user_id, updated_at DESC);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversations_owner" ON public.conversations;
CREATE POLICY "conversations_owner" ON public.conversations FOR ALL USING (auth.uid() = user_id);

-- ── user_bookmarks ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_bookmarks (
  user_id        uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  slug           text        NOT NULL,
  title          text        NOT NULL DEFAULT '',
  author         text        NOT NULL DEFAULT '',
  cover_url      text        NOT NULL DEFAULT '',
  genres         jsonb       NOT NULL DEFAULT '[]'::jsonb,
  total_chapters integer     NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, slug)
);
CREATE INDEX IF NOT EXISTS user_bookmarks_user ON public.user_bookmarks (user_id, created_at DESC);
ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bookmarks_owner" ON public.user_bookmarks;
CREATE POLICY "bookmarks_owner" ON public.user_bookmarks FOR ALL USING (auth.uid() = user_id);

-- ── novel_characters (extracted character cache + rich profiles) ─────────────
CREATE TABLE IF NOT EXISTS public.novel_characters (
  slug        text PRIMARY KEY,
  characters  jsonb NOT NULL DEFAULT '[]'::jsonb,
  profiles    jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at  timestamptz DEFAULT now()
);

-- ── game_sessions (reconstructed from code: id/user_id/game_type/state/expires) ─
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  game_type  text NOT NULL,
  state      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);
CREATE INDEX IF NOT EXISTS game_sessions_user ON public.game_sessions (user_id, created_at DESC);
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "game_sessions_owner" ON public.game_sessions;
CREATE POLICY "game_sessions_owner" ON public.game_sessions FOR ALL USING (auth.uid() = user_id);

-- ── login_attempts (reconstructed: per-account lockout) ──────────────────────
CREATE TABLE IF NOT EXISTS public.login_attempts (
  email         text PRIMARY KEY,
  fail_count    integer NOT NULL DEFAULT 0,
  locked_until  timestamptz,
  alert_sent_at timestamptz,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
-- server-only (service role); no anon access
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- ── token_purchases (reconstructed from insert: user_id/tokens_added/ref/created) ─
CREATE TABLE IF NOT EXISTS public.token_purchases (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tokens_added     integer NOT NULL,
  stripe_reference text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS token_purchases_user ON public.token_purchases (user_id, created_at DESC);
ALTER TABLE public.token_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "token_purchases_owner" ON public.token_purchases;
CREATE POLICY "token_purchases_owner" ON public.token_purchases FOR SELECT USING (auth.uid() = user_id);

-- ── novels (metadata bookkeeping; embedding status now tracked in Qdrant) ────
CREATE TABLE IF NOT EXISTS public.novels (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                 text UNIQUE NOT NULL,
  title                text NOT NULL DEFAULT '',
  author               text NOT NULL DEFAULT '',
  description          text NOT NULL DEFAULT '',
  cover_url            text NOT NULL DEFAULT '',
  genres               jsonb NOT NULL DEFAULT '[]'::jsonb,
  status               text NOT NULL DEFAULT '',
  source_url           text NOT NULL DEFAULT '',
  total_chapters       integer NOT NULL DEFAULT 0,
  scraped_at           timestamptz,
  is_embedded          boolean NOT NULL DEFAULT false,
  embedding_started_at timestamptz,
  embedded_at          timestamptz,
  chunk_count          integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS novels_slug_idx ON public.novels (slug);
