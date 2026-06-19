-- Site announcements (shown on the homepage). Push a new one by inserting a row in
-- the Supabase table editor: set title + body, leave published=true. Set published
-- =false to hide, pinned=true to force it to the top. Read server-side via the
-- service key, so RLS stays locked (no public policy needed).
create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  published  boolean not null default true,
  pinned     boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists announcements_feed_idx on public.announcements (published, pinned desc, created_at desc);
alter table public.announcements enable row level security;
