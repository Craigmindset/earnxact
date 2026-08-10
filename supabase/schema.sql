-- ============================================================
--  Earnxact – Supabase Schema Migration
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "unaccent";   -- for future full-text search

-- ── Custom Enum Types ────────────────────────────────────────
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

  -- EarnPass task class (null = no class registered yet)
  task_class_id         text,

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


-- ============================================================
--  Watch Ads Feature
-- ============================================================

do $$ begin
  create type ad_reward_type as enum ('cash', 'points');
exception when duplicate_object then null; end $$;

-- ── Ads catalog ───────────────────────────────────────────────
create table if not exists public.ads (
  id               uuid           primary key default gen_random_uuid(),
  slug             text           unique not null,
  title            text           not null,
  category         text           not null default 'General',
  duration_seconds integer        not null default 30,
  reward_type      ad_reward_type not null default 'cash',
  reward_amount    numeric(10,2)  not null default 0.00,
  vast_tag_url     text,
  is_active        boolean        not null default true,
  created_at       timestamptz    not null default now()
);

alter table public.ads enable row level security;
create policy "ads: read active" on public.ads for select using (is_active = true);

-- ── Ad views (per-user watch history) ────────────────────────
create table if not exists public.ad_views (
  id            uuid           primary key default gen_random_uuid(),
  user_id       uuid           not null references public.users(id) on delete cascade,
  ad_id         uuid           not null references public.ads(id)   on delete cascade,
  reward_type   ad_reward_type not null,
  reward_amount numeric(10,2)  not null,
  viewed_at     timestamptz    not null default now()
);

create index if not exists ad_views_user_day_idx on public.ad_views (user_id, viewed_at);

alter table public.ad_views enable row level security;
create policy "ad_views: read own"   on public.ad_views for select using (auth.uid() = user_id);
create policy "ad_views: insert own" on public.ad_views for insert with check (auth.uid() = user_id);

create policy "wallet_txns: insert own"
  on public.wallet_transactions for insert
  with check (auth.uid() = user_id);

-- ── Seed: default ads ─────────────────────────────────────────
insert into public.ads (slug, title, category, duration_seconds, reward_type, reward_amount) values
  ('mobile-banking-ad',   'Mobile Banking Made Easy',   'Finance',   30, 'cash',   50.00),
  ('learn-to-code-ad',    'Learn to Code in 30 Days',   'Education', 45, 'points', 20.00),
  ('crypto-trading-ad',   'Crypto Trading Platform',    'Finance',   60, 'cash',   100.00),
  ('fashion-week-ad',     'Fashion Week Deals',         'Shopping',  30, 'points', 15.00),
  ('food-delivery-ad',    'Fast Food Delivery App',     'Lifestyle', 20, 'cash',   30.00),
  ('solar-energy-ad',     'Solar Energy for Homes',     'Energy',    45, 'cash',   75.00),
  ('ecommerce-launch-ad', 'E-Commerce Platform Launch', 'Shopping',  30, 'points', 25.00),
  ('online-insurance-ad', 'Online Insurance Plans',     'Finance',   40, 'cash',   60.00)
on conflict (slug) do nothing;

-- ── claim_ad_reward: security-definer RPC ────────────────────
-- Validates daily limits by task class and credits wallet or leaderboard atomically
create or replace function public.claim_ad_reward(p_ad_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id     uuid;
  v_task_class  text;
  v_daily_limit integer;
  v_views_today integer;
  v_ad          record;
  v_wallet_id   uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select * into v_ad from public.ads where id = p_ad_id and is_active = true;
  if not found then
    return jsonb_build_object('success', false, 'error', 'ad_not_found');
  end if;

  if exists (
    select 1 from public.ad_views
    where user_id = v_user_id
      and ad_id   = p_ad_id
      and viewed_at >= (current_date::timestamptz at time zone 'UTC')
  ) then
    return jsonb_build_object('success', false, 'error', 'already_watched');
  end if;

  select task_class_id into v_task_class from public.users where id = v_user_id;

  v_daily_limit := case v_task_class
    when 'task-class-1'     then 3
    when 'task-class-2'     then 5
    when 'upscale-class'    then 7
    when 'superior-class'   then 10
    when 'junior-manager'   then 12
    when 'mid-executive'    then 15
    when 'executive'        then 18
    when 'senior-executive' then 20
    else 0
  end;

  if v_daily_limit = 0 then
    return jsonb_build_object('success', false, 'error', 'no_class_registered');
  end if;

  select count(*) into v_views_today
  from public.ad_views
  where user_id  = v_user_id
    and viewed_at >= (current_date::timestamptz at time zone 'UTC');

  if v_views_today >= v_daily_limit then
    return jsonb_build_object('success', false, 'error', 'daily_limit_reached');
  end if;

  insert into public.ad_views (user_id, ad_id, reward_type, reward_amount)
  values (v_user_id, p_ad_id, v_ad.reward_type, v_ad.reward_amount);

  if v_ad.reward_type = 'cash' then
    select id into v_wallet_id from public.wallets where user_id = v_user_id;

    update public.wallets
    set balance      = balance      + v_ad.reward_amount,
        total_earned = total_earned + v_ad.reward_amount
    where user_id = v_user_id;

    insert into public.wallet_transactions (wallet_id, user_id, type, amount, description)
    values (v_wallet_id, v_user_id, 'credit', v_ad.reward_amount,
            'Ad watch reward: ' || v_ad.title);

  elsif v_ad.reward_type = 'points' then
    insert into public.leaderboard
      (user_id, total_points, weekly_points, monthly_points, season)
    values
      (v_user_id,
       v_ad.reward_amount::integer,
       v_ad.reward_amount::integer,
       v_ad.reward_amount::integer,
       to_char(now(), 'IYYY"-W"IW'))
    on conflict (user_id, season)
    do update set
      total_points   = leaderboard.total_points   + excluded.total_points,
      weekly_points  = leaderboard.weekly_points  + excluded.weekly_points,
      monthly_points = leaderboard.monthly_points + excluded.monthly_points,
      updated_at     = now();
  end if;

  return jsonb_build_object(
    'success',       true,
    'reward_type',   v_ad.reward_type,
    'reward_amount', v_ad.reward_amount
  );
end;
$$;

grant execute on function public.claim_ad_reward(uuid) to authenticated;
