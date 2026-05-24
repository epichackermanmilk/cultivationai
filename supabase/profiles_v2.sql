-- Migration v2: add username, age, and onboarding bonus tracking
-- Run in Supabase SQL Editor after profiles.sql

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS age     integer CHECK (age >= 13 AND age <= 120),
  ADD COLUMN IF NOT EXISTS onboarding_bonus_claimed boolean NOT NULL DEFAULT false;

-- Usernames must be unique (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

-- Fast lookup by username
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles (username);
