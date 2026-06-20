-- Adds the missing email_marketing_consent column to profiles.
-- Its absence made /api/profile's SELECT error out, which (a) reported 0 tokens in
-- the shop/profile cards and (b) previously let the self-heal path zero balances.
-- Run once in the Supabase SQL editor.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_marketing_consent boolean NOT NULL DEFAULT false;
