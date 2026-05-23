-- Run this in the Supabase SQL Editor
-- Creates the user profiles table (linked to Supabase Auth)

create table if not exists public.profiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  email      text        not null,
  tokens     integer     not null default 100,
  created_at timestamptz not null default now()
);

-- Only service role can touch this table (all our writes go through API routes)
alter table public.profiles enable row level security;

-- Allow users to read their own row (needed if we ever use anon key client-side)
create policy if not exists "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Index for fast lookups
create index if not exists profiles_id_idx on public.profiles(id);
