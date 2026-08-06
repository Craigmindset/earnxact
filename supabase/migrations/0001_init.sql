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
drop table if exists public.referral_data cascade;
drop table if exists public.referrals cascade;
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
  avatar_url   text,
  registered_device_id text,
  referral_code    text unique,
  wallet_balance   numeric(12, 2) not null default 0.00,
  referred_by_id   uuid references public.user_profile(user_id),
  user_referral_link text,
  account_type account_type not null default 'standard',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Safe to re-run on an existing table (only runs if this reset section above
-- was skipped/adjusted): ensures avatar_url exists without dropping data.
alter table public.user_profile add column if not exists avatar_url text;

-- Stores the IP address seen on the user's first successful login. Later
-- logins from a different IP are only logged/flagged server-side, never
-- block sign-in. Safe to re-run on an existing table.
alter table public.user_profile add column if not exists registered_device_id text;

-- ─── Referral program columns (safe to re-run on an existing table) ─────────
alter table public.user_profile add column if not exists referral_code text;
alter table public.user_profile add column if not exists wallet_balance numeric(12, 2) not null default 0.00;
alter table public.user_profile add column if not exists referred_by_id uuid references public.user_profile(user_id);

-- Stores the full shareable link built from referral_code at signup time
-- (e.g. https://earnxact.com/signup?ref=AB3F9K), so the app never has to
-- reconstruct it client-side. Update EARNXACT_SITE_URL below if your
-- production domain changes.
alter table public.user_profile add column if not exists user_referral_link text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_profile_referral_code_key'
  ) then
    alter table public.user_profile
      add constraint user_profile_referral_code_key unique (referral_code);
  end if;
end $$;

-- One-time backfill: users created before the referral program existed
-- have referral_code / user_referral_link = null (the trigger below only
-- runs for brand-new signups). This assigns a fresh, unique code + link to
-- every such row so old accounts get the exact same referral setup as new
-- ones. Safe to re-run - only touches rows still missing a code.
do $$
declare
  v_site_url constant text := 'https://earnxact.com';
  r record;
  v_code text;
  v_attempt int;
begin
  for r in select user_id from public.user_profile where referral_code is null loop
    v_attempt := 0;
    loop
      v_attempt := v_attempt + 1;
      v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
      begin
        update public.user_profile
        set referral_code = v_code,
            user_referral_link = v_site_url || '/signup?ref=' || v_code,
            updated_at = now()
        where user_id = r.user_id;
        exit;
      exception
        when unique_violation then
          if v_attempt >= 5 then
            raise;
          end if;
      end;
    end loop;
  end loop;
end $$;

-- Referral ledger: one row per successfully rewarded referral. The unique
-- constraint on referee_id guarantees each new user can only ever trigger
-- one reward, no matter how many times a signup/trigger is retried.
create table if not exists public.referrals (
  id            uuid primary key default gen_random_uuid(),
  referrer_id   uuid not null references public.user_profile(user_id) on delete cascade,
  referee_id    uuid not null unique references public.user_profile(user_id) on delete cascade,
  reward_amount numeric(12, 2) not null default 50.00,
  created_at    timestamptz not null default now()
);

-- Contact info for the referred user, captured at reward time so a referrer
-- can see who they invited. Added here (rather than a brand-new table)
-- because referrals already has exactly one row per referred user under a
-- referrer (referee_id is unique) - a separate 1:1 table would just
-- duplicate that same shape. Safe to re-run on an existing table.
alter table public.referrals add column if not exists referee_first_name text;
alter table public.referrals add column if not exists referee_last_name text;
alter table public.referrals add column if not exists referee_email text;
alter table public.referrals add column if not exists referee_phone text;

-- Denormalized, realtime-friendly summary row per user: one row created for
-- every signed-up user (whether they've referred anyone yet or not) so the
-- dashboard can subscribe to postgres_changes on a single, always-existing
-- row instead of re-aggregating referrals on every render. users_referred /
-- referral_balance are only ever updated transactionally alongside the
-- referrals insert in handle_new_user()/claim_referral_balance() below -
-- never written to directly by clients.
create table if not exists public.referral_data (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  first_name       text,
  last_name        text,
  referral_link    text,
  users_referred   integer not null default 0,
  referral_balance numeric(12, 2) not null default 0.00,
  last_claim_date  timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- One-time backfill for users that already existed before this table was
-- added: seeds a referral_data row for every user_profile row, computing
-- users_referred / referral_balance from the existing referrals ledger so
-- no historical referral activity is lost. Safe to re-run - "on conflict do
-- nothing" skips rows that already exist.
insert into public.referral_data (
  user_id, first_name, last_name, referral_link, users_referred, referral_balance
)
select
  up.user_id,
  up.first_name,
  up.last_name,
  up.user_referral_link,
  coalesce(r.users_referred, 0),
  coalesce(r.referral_balance, 0.00)
from public.user_profile up
left join (
  select referrer_id, count(*) as users_referred, sum(reward_amount) as referral_balance
  from public.referrals
  group by referrer_id
) r on r.referrer_id = up.user_id
on conflict (user_id) do nothing;

-- Syncs already-existing referral_data rows whose referral_link is still
-- null (e.g. they were backfilled above before the referral_code backfill
-- ran). Safe to re-run - only touches rows that are actually out of sync.
update public.referral_data rd
set referral_link = up.user_referral_link,
    updated_at = now()
from public.user_profile up
where rd.user_id = up.user_id
  and rd.referral_link is null
  and up.user_referral_link is not null;

-- Add referral_data to the Supabase realtime publication so clients can
-- subscribe to postgres_changes on it (guarded so re-running never errors).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'referral_data'
  ) then
    alter publication supabase_realtime add table public.referral_data;
  end if;
end $$;

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
create index if not exists referrals_referrer_id_idx on public.referrals(referrer_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table public.user_profile enable row level security;
alter table public.membership_plans enable row level security;
alter table public.transactions enable row level security;
alter table public.users_mission enable row level security;
alter table public.watch_videos enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_data enable row level security;

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

-- Users can only see referral ledger rows where they are the referrer (i.e.
-- their own "invites" / earned-rewards history). No insert/update/delete
-- policy is defined for regular users — all writes happen exclusively via
-- the SECURITY DEFINER handle_new_user() trigger function below.
drop policy if exists "Users can view their own referrals" on public.referrals;
create policy "Users can view their own referrals"
  on public.referrals for select
  using (auth.uid() = referrer_id);

-- Users can only see their own realtime referral summary row. No
-- insert/update/delete policy is defined for regular users — all writes
-- happen exclusively via SECURITY DEFINER functions (handle_new_user() and
-- claim_referral_balance() below).
drop policy if exists "Users can view their own referral data" on public.referral_data;
create policy "Users can view their own referral data"
  on public.referral_data for select
  using (auth.uid() = user_id);

-- ─── Auto-create a user_profile row whenever a new auth user signs up ────────
-- Reads first_name/last_name/phone_num/account_type from the metadata passed
-- via supabase.auth.signUp({ options: { data: { ... } } }) on the client.

-- Referral crediting is folded into this same function (rather than a
-- second "AFTER INSERT ON auth.users" trigger) because Postgres does not
-- guarantee trigger execution order across separate triggers on the same
-- event — doing it here guarantees the referrer lookup + wallet credit
-- happen atomically, in the same transaction, right after the new user's
-- own profile row is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  -- Base URL used to build user_referral_link. Update this if the
  -- production domain ever changes.
  v_site_url constant text := 'https://earnxact.com';
  v_referrer_id uuid;
  v_input_referral_code text;
  v_new_referral_code text;
  v_attempt int := 0;
begin
  -- The invite code the new user signed up with (if any), and the fresh
  -- referral code generated for the new user themselves (see
  -- src/components/SignupForm.tsx). Both arrive via
  -- supabase.auth.signUp({ options: { data: { ... } } }).
  v_input_referral_code := nullif(upper(trim(new.raw_user_meta_data ->> 'referral_code')), '');
  v_new_referral_code := nullif(upper(trim(new.raw_user_meta_data ->> 'user_referral_code')), '');

  if v_input_referral_code is not null then
    select user_id into v_referrer_id
    from public.user_profile
    where referral_code = v_input_referral_code
    limit 1;

    -- Prevent self-referral (only possible if a user's own code somehow
    -- ended up back in their own signup metadata).
    if v_referrer_id = new.id then
      v_referrer_id := null;
    end if;
  end if;

  -- Retry loop guards against the astronomically unlikely case of a
  -- referral_code collision so a bad random code can never block signup.
  -- The code is resolved into a variable up front (rather than inline in
  -- the INSERT below) so user_referral_link can be built from the exact
  -- same code that ends up persisted.
  loop
    v_attempt := v_attempt + 1;
    if v_new_referral_code is null then
      v_new_referral_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    end if;

    begin
      insert into public.user_profile (
        user_id, first_name, last_name, email, phone_num, account_type,
        referral_code, referred_by_id, user_referral_link
      )
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
        ),
        v_new_referral_code,
        v_referrer_id,
        v_site_url || '/signup?ref=' || v_new_referral_code
      )
      on conflict (user_id) do update
        set first_name = excluded.first_name,
            last_name = excluded.last_name,
            email = excluded.email,
            phone_num = excluded.phone_num,
            account_type = excluded.account_type,
            updated_at = now();
      exit; -- insert succeeded, stop retrying
    exception
      when unique_violation then
        if v_attempt >= 5 then
          raise;
        end if;
        -- referral_code collided with an existing user's code — regenerate
        -- and retry rather than failing the whole signup.
        v_new_referral_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    end;
  end loop;

  -- Every user gets a realtime referral_data summary row from day one, even
  -- if they never refer anyone - this is what the invite-earn page
  -- subscribes to for live users_referred / referral_balance / last_claim_date.
  insert into public.referral_data (user_id, first_name, last_name, referral_link)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    v_site_url || '/signup?ref=' || v_new_referral_code
  )
  on conflict (user_id) do update
    set first_name = excluded.first_name,
        last_name = excluded.last_name,
        referral_link = excluded.referral_link,
        updated_at = now();

  -- Record the referral + credit the referrer's realtime referral_balance
  -- exactly once. The unique constraint on referrals.referee_id (combined
  -- with "on conflict do nothing") is what actually guarantees idempotency
  -- — even if this trigger were ever re-run for the same user, the reward
  -- can never be granted twice. Referral earnings accumulate in
  -- referral_data.referral_balance (not user_profile.wallet_balance) until
  -- the user claims them via claim_referral_balance() below.
  if v_referrer_id is not null then
    insert into public.referrals (
      referrer_id, referee_id, reward_amount,
      referee_first_name, referee_last_name, referee_email, referee_phone
    )
    values (
      v_referrer_id, new.id, 50.00,
      new.raw_user_meta_data ->> 'first_name',
      new.raw_user_meta_data ->> 'last_name',
      new.email,
      new.raw_user_meta_data ->> 'phone_num'
    )
    on conflict (referee_id) do nothing;

    if found then
      update public.referral_data
      set users_referred = users_referred + 1,
          referral_balance = referral_balance + 50.00,
          updated_at = now()
      where user_id = v_referrer_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Claim referral earnings ───────────────────────────────────────────────────────────────
-- Moves the caller's current, unclaimed referral_data.referral_balance into
-- their spendable user_profile.wallet_balance, then resets referral_balance
-- to 0 and stamps last_claim_date. Keep the 500.00 minimum in sync with
-- MINIMUM_CLAIM in src/app/dashboard/invite-earn/page.tsx.
create or replace function public.claim_referral_balance()
returns table(claimed_amount numeric, new_wallet_balance numeric)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_balance numeric(12, 2);
  v_new_wallet numeric(12, 2);
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Lock the row so two concurrent claim requests can't both succeed.
  select referral_balance into v_balance
  from public.referral_data
  where user_id = v_user_id
  for update;

  if v_balance is null then
    raise exception 'No referral data found for this account';
  end if;

  if v_balance < 500.00 then
    raise exception 'Referral balance is below the minimum claim amount';
  end if;

  update public.referral_data
  set referral_balance = 0,
      last_claim_date = now(),
      updated_at = now()
  where user_id = v_user_id;

  update public.user_profile
  set wallet_balance = wallet_balance + v_balance,
      updated_at = now()
  where user_id = v_user_id
  returning wallet_balance into v_new_wallet;

  return query select v_balance, v_new_wallet;
end;
$$;

grant execute on function public.claim_referral_balance() to authenticated;
