-- ============================================================
--  Earnxact – Supabase Schema Migration
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "unaccent";   -- for future full-text search

-- ── Custom Enum Types ────────────────────────────────────────
do $$ begin
  create type plan_category as enum ('free', 'basic', 'premium', 'vip');
exception when duplicate_object then null; end $$;

do $$ begin
  create type referral_status as enum ('pending', 'active', 'rewarded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type wallet_transaction_type as enum ('credit', 'debit', 'withdrawal', 'bonus');
exception when duplicate_object then null; end $$;

-- ============================================================
--  PRIMARY TABLE: users
-- ============================================================
create table if not exists public.users (
  -- Identity
  id                    uuid          primary key default gen_random_uuid(),
  user_id               text          unique not null,            -- e.g. EXU-A1B2C3
  username              text          unique not null,
  first_name            text          not null,
  last_name             text          not null,
  email                 text          unique not null,
  phone_number          text,
  avatar_url            text,

  -- Bank / Payout details
  account_name          text,
  account_number        text,
  bank_name             text,

  -- Plan / Subscription
  plan_category         plan_category not null default 'free',

  -- Referral
  referral_code         text          unique not null,            -- user's own shareable code
  referred_by           uuid          references public.users(id) on delete set null,

  -- Check-in
  check_in_streak       integer       not null default 0,
  last_check_in         timestamptz,

  -- Daily Tasks
  daily_tasks_completed integer       not null default 0,
  daily_tasks_reset_at  timestamptz,

  -- Status
  is_active             boolean       not null default true,
  kyc_verified          boolean       not null default false,

  -- Timestamps
  created_at            timestamptz   not null default now(),
  updated_at            timestamptz   not null default now()
);

-- ── Indexes ───────────────────────────────────────────────────
create index if not exists users_email_idx       on public.users (email);
create index if not exists users_referral_code_idx on public.users (referral_code);
create index if not exists users_referred_by_idx on public.users (referred_by);

-- ── Auto-update updated_at ────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ── Row-Level Security ────────────────────────────────────────
alter table public.users enable row level security;

-- Users can read/update their own row; service role bypasses RLS.
create policy "users: read own"   on public.users for select using (auth.uid() = id);
create policy "users: update own" on public.users for update using (auth.uid() = id);
create policy "users: insert own" on public.users for insert with check (auth.uid() = id);


-- ============================================================
--  SECONDARY TABLE: wallets
-- ============================================================
create table if not exists public.wallets (
  id               uuid         primary key default gen_random_uuid(),
  user_id          uuid         not null unique references public.users(id) on delete cascade,
  balance          numeric(12,2) not null default 0.00,
  total_earned     numeric(12,2) not null default 0.00,
  total_withdrawn  numeric(12,2) not null default 0.00,
  pending_balance  numeric(12,2) not null default 0.00,
  currency         text         not null default 'NGN',
  updated_at       timestamptz  not null default now()
);

create or replace trigger wallets_set_updated_at
  before update on public.wallets
  for each row execute function public.set_updated_at();

alter table public.wallets enable row level security;

create policy "wallets: read own"   on public.wallets for select using (auth.uid() = user_id);
create policy "wallets: update own" on public.wallets for update using (auth.uid() = user_id);

-- ── wallet_transactions (audit log – insert only) ─────────────
create table if not exists public.wallet_transactions (
  id          uuid                      primary key default gen_random_uuid(),
  wallet_id   uuid                      not null references public.wallets(id) on delete cascade,
  user_id     uuid                      not null references public.users(id)   on delete cascade,
  type        wallet_transaction_type   not null,
  amount      numeric(12,2)             not null,
  description text,
  reference   text,
  created_at  timestamptz               not null default now()
);

create index if not exists wallet_transactions_user_idx on public.wallet_transactions (user_id);

alter table public.wallet_transactions enable row level security;
create policy "wallet_txns: read own" on public.wallet_transactions for select using (auth.uid() = user_id);


-- ============================================================
--  SECONDARY TABLE: referrals
-- ============================================================
create table if not exists public.referrals (
  id             uuid             primary key default gen_random_uuid(),
  referrer_id    uuid             not null references public.users(id) on delete cascade,
  referred_id    uuid             not null unique references public.users(id) on delete cascade,
  referral_code  text             not null,
  status         referral_status  not null default 'pending',
  reward_amount  numeric(10,2)    not null default 0.00,
  created_at     timestamptz      not null default now(),
  updated_at     timestamptz      not null default now()
);

create index if not exists referrals_referrer_idx on public.referrals (referrer_id);

create or replace trigger referrals_set_updated_at
  before update on public.referrals
  for each row execute function public.set_updated_at();

alter table public.referrals enable row level security;

-- Referrer can see all referrals they generated
create policy "referrals: read own" on public.referrals
  for select using (auth.uid() = referrer_id);


-- ============================================================
--  SECONDARY TABLE: leaderboard
-- ============================================================
create table if not exists public.leaderboard (
  id             uuid         primary key default gen_random_uuid(),
  user_id        uuid         not null references public.users(id) on delete cascade,
  total_points   integer      not null default 0,
  weekly_points  integer      not null default 0,
  monthly_points integer      not null default 0,
  -- season format: "2024-W32"  (weekly) or "2024-08" (monthly)
  season         text         not null default to_char(now(), 'IYYY"-W"IW'),
  rank           integer,
  updated_at     timestamptz  not null default now(),

  unique (user_id, season)
);

create index if not exists leaderboard_season_rank_idx on public.leaderboard (season, rank);

create or replace trigger leaderboard_set_updated_at
  before update on public.leaderboard
  for each row execute function public.set_updated_at();

alter table public.leaderboard enable row level security;
create policy "leaderboard: public read" on public.leaderboard for select using (true);


-- ============================================================
--  Helper: auto-create a wallet row when a user row is created
-- ============================================================
create or replace function public.handle_new_user_wallet()
returns trigger language plpgsql security definer as $$
begin
  insert into public.wallets (user_id) values (new.id);
  return new;
end;
$$;

create or replace trigger on_user_created_create_wallet
  after insert on public.users
  for each row execute function public.handle_new_user_wallet();
