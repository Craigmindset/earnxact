-- Earnxact initial schema
-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query)
-- for your project. Safe to re-run: drops and recreates its own objects
-- first, so a partial/earlier run (e.g. an out-of-date enum) can't conflict.

create extension if not exists "pgcrypto";

-- ─── Reset (safe to re-run) ───────────────────────────────────────────────────
-- Drops only the objects this script owns, so re-running always starts clean.
-- This intentionally cascades to the tables below - only run this on a fresh
-- project or if you're OK losing data in these specific tables.

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;

-- Removes a stray legacy trigger/function (from an earlier/unrelated setup)
-- that referenced a non-existent "user_profiles" (plural) table and caused
-- every signup to fail with "relation user_profiles does not exist".
drop trigger if exists auth_users_after_insert_trigger on auth.users;
drop function if exists public.auth_on_user_created() cascade;

drop table if exists public.watch_videos cascade;
drop table if exists public.users_mission cascade;
drop table if exists public.transactions cascade;
drop table if exists public.membership_plans cascade;
drop table if exists public.user_profile cascade;

drop type if exists transaction_status cascade;
drop type if exists transaction_type cascade;
drop type if exists mission_status cascade;
drop type if exists mission_period cascade;
drop type if exists account_type cascade;

-- ─── Enums ────────────────────────────────────────────────────────────────────

create type account_type as enum ('standard', 'premium', 'vip');
create type transaction_type as enum ('credit', 'debit', 'withdrawal', 'bonus');
create type transaction_status as enum ('pending', 'completed', 'failed');
create type mission_period as enum ('daily', 'weekly');
create type mission_status as enum ('in_progress', 'completed', 'claimed');

-- ─── Tables ───────────────────────────────────────────────────────────────────

create table if not exists public.user_profile (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  first_name   text,
  last_name    text,
  email        text not null,
  phone_num    text,
  account_type account_type not null default 'standard',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.membership_plans (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  amount       numeric not null,
  description  text,
  is_available boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        transaction_type not null,
  amount      numeric not null,
  status      transaction_status not null default 'pending',
  reference   text,
  description text,
  created_at  timestamptz not null default now()
);

create table if not exists public.users_mission (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  mission_id   text not null,
  period       mission_period not null,
  status       mission_status not null default 'in_progress',
  progress     integer not null default 0,
  reward       numeric not null default 0,
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists public.watch_videos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  video_id    text not null,
  reward      numeric not null default 0,
  watched_at  timestamptz not null default now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists users_mission_user_id_idx on public.users_mission(user_id);
create index if not exists watch_videos_user_id_idx on public.watch_videos(user_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table public.user_profile enable row level security;
alter table public.membership_plans enable row level security;
alter table public.transactions enable row level security;
alter table public.users_mission enable row level security;
alter table public.watch_videos enable row level security;

drop policy if exists "Users can view their own profile" on public.user_profile;
create policy "Users can view their own profile"
  on public.user_profile for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update their own profile" on public.user_profile;
create policy "Users can update their own profile"
  on public.user_profile for update
  using (auth.uid() = user_id);

-- Allow Supabase Auth's internal role to insert profile rows from the
-- on_auth_user_created trigger.
drop policy if exists "Auth admin can insert profile" on public.user_profile;
create policy "Auth admin can insert profile"
  on public.user_profile for insert
  to supabase_auth_admin
  with check (true);

drop policy if exists "Anyone can view membership plans" on public.membership_plans;
create policy "Anyone can view membership plans"
  on public.membership_plans for select
  using (true);

drop policy if exists "Users can view their own transactions" on public.transactions;
create policy "Users can view their own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can view their own missions" on public.users_mission;
create policy "Users can view their own missions"
  on public.users_mission for select
  using (auth.uid() = user_id);

drop policy if exists "Users can view their own watch history" on public.watch_videos;
create policy "Users can view their own watch history"
  on public.watch_videos for select
  using (auth.uid() = user_id);

-- ─── Auto-create a user_profile row whenever a new auth user signs up ────────
-- Reads first_name/last_name/phone_num/account_type from the metadata passed
-- via supabase.auth.signUp({ options: { data: { ... } } }) on the client.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profile (user_id, first_name, last_name, email, phone_num, account_type)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.email,
    new.raw_user_meta_data ->> 'phone_num',
    coalesce(
      case
        when (new.raw_user_meta_data ->> 'account_type') in ('standard', 'premium', 'vip')
          then (new.raw_user_meta_data ->> 'account_type')::account_type
        else null
      end,
      'standard'
    )
  )
  on conflict (user_id) do update
    set first_name = excluded.first_name,
        last_name = excluded.last_name,
        email = excluded.email,
        phone_num = excluded.phone_num,
        account_type = excluded.account_type,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
