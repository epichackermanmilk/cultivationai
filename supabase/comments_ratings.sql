-- Comments + ratings for novels.
-- Run once in the Supabase SQL editor. All access is server-side via the service
-- key (which bypasses RLS), so RLS is enabled with no public policies = locked down.

-- ── Comments ────────────────────────────────────────────────────────────────────
create table if not exists public.novel_comments (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null,
  user_id       uuid not null references auth.users(id) on delete cascade,
  author_name   text,
  author_avatar text,
  body          text not null,
  created_at    timestamptz not null default now()
);
create index if not exists novel_comments_slug_idx on public.novel_comments (slug, created_at desc);
alter table public.novel_comments enable row level security;

-- ── Ratings (one per user per novel) ────────────────────────────────────────────
create table if not exists public.novel_ratings (
  slug       text not null,
  user_id    uuid not null references auth.users(id) on delete cascade,
  rating     int  not null check (rating between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (slug, user_id)
);
create index if not exists novel_ratings_slug_idx on public.novel_ratings (slug);
alter table public.novel_ratings enable row level security;
