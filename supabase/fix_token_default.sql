-- ════════════════════════════════════════════════════════════════════════════
-- FIX: new accounts were getting 100 tokens instead of 40
-- ────────────────────────────────────────────────────────────────────────────
-- Root cause: profiles.tokens column DEFAULT was 100, and the on_auth_user_created
-- trigger inserts (id, email) only — so tokens fell back to that default. Email
-- signups were corrected to 40 by the signup API route, but Google OAuth signups
-- never hit that route and kept 100.
--
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Correct the column default so any future insert that omits tokens = 40.
ALTER TABLE public.profiles ALTER COLUMN tokens SET DEFAULT 40;

-- 2) Make the signup trigger seed the welcome grant explicitly (belt + suspenders).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, tokens)
  VALUES (new.id, new.email, 40)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) OPTIONAL — repair existing over-granted accounts that never purchased.
--    Accounts still sitting on the buggy 100 default (no purchases):
--      • profile incomplete  (bonus not claimed) → should be 40
--      • profile completed    (bonus claimed)     → should be 50
--    Review the SELECT first, then uncomment the UPDATEs if you want to correct them.
--
-- SELECT id, email, tokens, onboarding_bonus_claimed, tokens_ever_purchased
-- FROM public.profiles
-- WHERE tokens IN (100, 110) AND tokens_ever_purchased = 0;
--
-- UPDATE public.profiles SET tokens = 40
--   WHERE tokens = 100 AND tokens_ever_purchased = 0 AND onboarding_bonus_claimed = false;
-- UPDATE public.profiles SET tokens = 50
--   WHERE tokens = 110 AND tokens_ever_purchased = 0 AND onboarding_bonus_claimed = true;

-- ────────────────────────────────────────────────────────────────────────────
-- 4) Atomic token debit (fixes the concurrent-chat under-charge race).
--    The app calls this RPC; it decrements in a single statement so two parallel
--    requests can't both read the same balance and under-deduct. Returns the new
--    balance, or NULL if the user didn't have enough (caller treats NULL as 402).
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.debit_tokens(p_user uuid, p_amount int)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_balance int;
BEGIN
  UPDATE public.profiles SET tokens = tokens - p_amount
  WHERE id = p_user AND tokens >= p_amount
  RETURNING tokens INTO new_balance;
  RETURN new_balance;   -- NULL when insufficient funds / no row
END;
$$;
REVOKE ALL ON FUNCTION public.debit_tokens(uuid, int) FROM public, anon, authenticated;
