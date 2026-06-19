-- Locked chapters (latest 20% of each novel) + EPUB download throttling.
-- Run once in the Supabase SQL editor. Access is server-side via the service key.

-- Per-user, per-chapter unlocks bought with tokens (2 tokens/chapter).
create table if not exists public.chapter_unlocks (
  user_id        uuid not null references auth.users(id) on delete cascade,
  slug           text not null,
  chapter_number integer not null,
  created_at     timestamptz not null default now(),
  primary key (user_id, slug, chapter_number)
);
create index if not exists chapter_unlocks_user_slug_idx on public.chapter_unlocks (user_id, slug);
alter table public.chapter_unlocks enable row level security;

-- EPUB download log — powers the 1-per-hour rate limit + abuse auditing.
create table if not exists public.epub_downloads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  slug        text not null,
  from_chapter integer,
  to_chapter   integer,
  tokens_spent integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists epub_downloads_user_idx on public.epub_downloads (user_id, created_at desc);
alter table public.epub_downloads enable row level security;
