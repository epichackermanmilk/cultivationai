-- ============================================================
-- COMPLETE PROFILES SETUP — run this entire block in Supabase SQL Editor
-- Creates the table from scratch with all columns
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id                       uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                    text        NOT NULL,
  tokens                   integer     NOT NULL DEFAULT 100,
  username                 text,
  age                      integer     CHECK (age >= 13 AND age <= 120),
  onboarding_bonus_claimed boolean     NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now()
);

-- RLS: only service-role writes; users can read their own row
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Indexes
CREATE INDEX IF NOT EXISTS profiles_id_idx
  ON public.profiles (id);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

-- ── Auto-create profile on every new signup (email OR Google OAuth) ──────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
