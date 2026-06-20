-- Reads-based popularity.
-- One row per chapter open (logged server-side, best-effort). Powers the homepage
-- Popular (weekly / monthly / all-time) and Trending Today rankings.
-- Run this once in the Supabase SQL editor.

create table if not exists public.novel_reads (
  id         bigint generated always as identity primary key,
  slug       text not null,
  user_id    uuid references auth.users(id) on delete set null,
  chapter    integer,
  created_at timestamptz not null default now()
);

create index if not exists novel_reads_created_idx      on public.novel_reads (created_at desc);
create index if not exists novel_reads_slug_created_idx  on public.novel_reads (slug, created_at desc);

-- Only the service key (server) writes/reads rows. No client policies → RLS denies
-- all anon/authenticated access by default, which is what we want.
alter table public.novel_reads enable row level security;

-- Aggregation: most-read novels since a cutoff (null = all time).
create or replace function public.popular_novels(p_since timestamptz, p_limit int default 24)
returns table(slug text, reads bigint)
language sql
stable
security definer
set search_path = public
as $$
  select slug, count(*)::bigint as reads
  from public.novel_reads
  where p_since is null or created_at >= p_since
  group by slug
  order by reads desc
  limit p_limit
$$;

grant execute on function public.popular_novels(timestamptz, int) to service_role, authenticated, anon;
