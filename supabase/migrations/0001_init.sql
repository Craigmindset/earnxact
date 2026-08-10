-- Earnxact initial schema
-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query)
-- for your project. Safe to re-run ONLY on a fresh project with no real
-- users yet - the "Reset" block right below unconditionally drops
-- user_profile, transactions, referral_data, referrals, users_mission,
-- watch_videos and membership_plans (with cascade), wiping all wallet
-- balances, referral history, transaction history and mission progress for
-- every existing user (their auth.users login itself is untouched, but
-- their profile row - and therefore the dashboard - would come back empty).
--
-- Once the project has real signed-up users, do NOT re-run this whole file.
-- Instead, run only the specific new/changed section(s) you need (e.g. a
-- single `create or replace function ...`, a single `alter table ... add
-- column if not exists ...`, or a single idempotent `do $$ ... $$` block)
-- copy-pasted out of this file in isolation.

create extension if not exists "pgcrypto";

-- ─── Reset (DESTRUCTIVE - fresh projects only, see warning above) ────────────
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

-- Tracks whether this specific referral's reward has been claimed yet.
-- Claiming (see claim_referral_balance() below) flips this to true, credits
-- reward_amount into user_profile.wallet_balance, and logs a transactions
-- row - each referral is independently claimable, no minimum balance.
alter table public.referrals add column if not exists referral_claim boolean not null default false;

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

-- Adds user_profile to the Supabase realtime publication so the dashboard
-- header/stat card and wallet page can subscribe to postgres_changes and
-- reflect wallet_balance updates (e.g. a referral claim) immediately,
-- without a page refresh. Guarded so re-running never errors.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_profile'
  ) then
    alter publication supabase_realtime add table public.user_profile;
  end if;
end $$;

-- Adds daily_checkins to the Supabase realtime publication so the check-in
-- page can reflect a claim made on another device/tab immediately. Guarded
-- so re-running never errors.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'daily_checkins'
  ) then
    alter publication supabase_realtime add table public.daily_checkins;
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

-- name must be unique so it can be referenced by a foreign key
-- (daily_task_templates.membership_name below).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'membership_plans_name_key'
  ) then
    alter table public.membership_plans add constraint membership_plans_name_key unique (name);
  end if;
end $$;


-- Seeds a default "Free" plan every user starts on, so
-- user_profile.membership_plan_id always resolves to a real row (rather
-- than being null / showing a blank category). Safe to re-run - only
-- inserts if a plan with this exact name doesn't already exist.
insert into public.membership_plans (name, amount, description, is_available)
select 'Free', 0, 'The default EarnXact membership - upgrade anytime for higher payouts.', true
where not exists (select 1 from public.membership_plans where name = 'Free');

-- Seeds the paid upgrade tiers, cheapest first. Safe to re-run - each row
-- only inserts if a plan with that exact name doesn't already exist, so
-- editing a plan's amount/description afterwards is done via a plain
-- `update public.membership_plans set ... where name = '...'` instead
-- (re-running this script won't revert an admin's manual edit).
insert into public.membership_plans (name, amount, description, is_available)
select v.name, v.amount, v.description, true
from (
  values
    ('Task class1', 5000::numeric, 'Entry-level paid plan.'),
    ('Task Class2', 10000::numeric, 'Second tier paid plan.'),
    ('Upscale Class', 20000::numeric, 'Upscale tier paid plan.'),
    ('Supervisor Class', 50000::numeric, 'Supervisor tier paid plan.'),
    ('Junior Manager', 100000::numeric, 'Junior Manager tier paid plan.'),
    ('mid executive', 200000::numeric, 'Mid Executive tier paid plan.'),
    ('Excecutive', 300000::numeric, 'Executive tier paid plan.'),
    ('Senior Executive', 500000::numeric, 'Senior Executive tier paid plan.'),
    ('Regional Manager', 1000000::numeric, 'Regional Manager tier paid plan.')
) as v(name, amount, description)
where not exists (select 1 from public.membership_plans where name = v.name);

-- Links each user to their currently chosen/active row in membership_plans
-- (e.g. the plan shown as their "category" on the Tasks page). Nullable so
-- existing rows don't break; backfilled to the Free plan just below.
-- on delete set null - losing the referenced plan should never cascade-
-- delete a user's profile.
alter table public.user_profile
  add column if not exists membership_plan_id uuid references public.membership_plans(id) on delete set null;

-- One-time backfill: every user without a membership_plan_id yet is put on
-- the default Free plan. Safe to re-run - only touches rows still null.
update public.user_profile
set membership_plan_id = (select id from public.membership_plans where name = 'Free' limit 1),
    updated_at = now()
where membership_plan_id is null;

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

-- Scopes a claimed mission to the exact daily/weekly window it was earned
-- in (e.g. '2026-08-10' for a daily mission, '2026-W32' for a weekly one),
-- so the same mission can be re-claimed once its window resets, but never
-- twice within the same window (enforced by the unique constraint below).
alter table public.users_mission add column if not exists period_key text;

alter table public.users_mission
  drop constraint if exists users_mission_user_mission_period_unique;
alter table public.users_mission
  add constraint users_mission_user_mission_period_unique unique (user_id, mission_id, period_key);

-- Raw ledger of every reward-wall payout a user has been credited for
-- (CPX Research today, TimeWall/AdGem etc. later - just add more `provider`
-- values, no schema change needed). Written only by each provider's
-- postback route (e.g. /api/postbacks/cpx). The unique (provider,
-- external_trans_id) constraint makes postback retries idempotent - a
-- duplicate delivery of the same transaction is silently ignored.
create table if not exists public.offerwall_transactions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  provider           text not null,
  external_trans_id  text not null,
  amount             numeric(12, 2) not null,
  status             text not null default 'credited' check (status in ('credited', 'reversed')),
  credited_at        timestamptz not null default now(),
  constraint offerwall_transactions_provider_trans_unique unique (provider, external_trans_id)
);

create index if not exists offerwall_transactions_user_id_idx on public.offerwall_transactions(user_id);

alter table public.offerwall_transactions enable row level security;

drop policy if exists "Users can view their own offerwall transactions" on public.offerwall_transactions;
create policy "Users can view their own offerwall transactions"
  on public.offerwall_transactions for select
  using (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'offerwall_transactions'
  ) then
    alter publication supabase_realtime add table public.offerwall_transactions;
  end if;
end $$;

-- Admin-managed catalog of the missions shown on /dashboard/missions that
-- are backed by real offerwall data. get_mission_status()/claim_mission()
-- read this table server-side so a client can never spoof its own reward
-- amount or goal target - edit rows here via SQL to retune missions.
create table if not exists public.mission_catalog (
  mission_id    text primary key,
  period        mission_period not null,
  -- 'provider_amount': sum(amount) for goal_provider this window
  -- 'distinct_providers': count(distinct provider) this window
  -- 'wall_total_amount': sum(amount) across all providers this window
  goal_type     text not null check (goal_type in ('provider_amount', 'distinct_providers', 'wall_total_amount')),
  goal_provider text,
  goal_target   numeric not null,
  reward        numeric not null,
  is_active     boolean not null default true
);

insert into public.mission_catalog (mission_id, period, goal_type, goal_provider, goal_target, reward)
values
  ('cpx_two_dollars_daily', 'daily', 'provider_amount', 'cpx', 2, 20),
  ('walls_two_providers_daily', 'daily', 'distinct_providers', null, 2, 25),
  ('walls_total_amount_weekly', 'weekly', 'wall_total_amount', null, 15, 100),
  ('cpx_five_dollars_weekly', 'weekly', 'provider_amount', 'cpx', 5, 15)
on conflict (mission_id) do nothing;

alter table public.mission_catalog enable row level security;

drop policy if exists "Authenticated users can view the mission catalog" on public.mission_catalog;
create policy "Authenticated users can view the mission catalog"
  on public.mission_catalog for select
  to authenticated
  using (true);


create table if not exists public.watch_videos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  video_id    text not null,
  reward      numeric not null default 0,
  watched_at  timestamptz not null default now()
);

-- Daily check-in ledger: one row per user per Nigeria-calendar-day claimed.
-- The unique constraint on (user_id, check_in_date) is what actually
-- prevents double-claiming the same day, even under concurrent requests -
-- see claim_daily_checkin() below, which is the only way rows are written.
create table if not exists public.daily_checkins (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  device_id     text not null,
  check_in_date date not null,
  streak        integer not null default 1,
  reward        numeric not null default 0,
  created_at    timestamptz not null default now(),
  constraint daily_checkins_user_date_unique unique (user_id, check_in_date)
);

-- Single-row config table so the daily check-in reward amount can be
-- changed at any time (update this row's reward_price via SQL) without a
-- code deploy - claim_daily_checkin() reads the current value on every
-- claim and stamps it onto that check-in's own "reward" column, so past
-- check-ins keep whatever amount they were actually paid.
create table if not exists public.checkin_settings (
  id           boolean primary key default true,
  reward_price numeric(12, 2) not null default 10.00,
  updated_at   timestamptz not null default now(),
  constraint checkin_settings_singleton check (id)
);

insert into public.checkin_settings (id, reward_price)
values (true, 10.00)
on conflict (id) do nothing;

-- Catalog of the Mon-Fri daily tasks shown on /dashboard/tasks. weekday
-- follows ISO (1=Monday ... 5=Friday) - deliberately capped at 5 so
-- weekends never have an active task. Admin-managed: edit title/
-- description/reward directly via SQL, no code deploy needed.
-- Each row belongs to exactly one membership plan (membership_plan_id) -
-- a user only ever sees the Mon-Fri task set for their own *current*
-- user_profile.membership_plan_id. Because the tasks page always queries
-- by the user's current plan (never caches an old plan's task set), the
-- moment a user's plan changes (e.g. an upgrade), the very next fetch
-- automatically shows that plan's tasks instead - no data migration of old
-- templates/submissions is needed.
create table if not exists public.daily_task_templates (
  id          uuid primary key default gen_random_uuid(),
  weekday     smallint not null check (weekday between 1 and 5),
  title       text not null,
  description text not null,
  reward      numeric(12, 2) not null default 0,
  is_active   boolean not null default true,
  membership_plan_id uuid not null references public.membership_plans(id) on delete cascade,
  membership_name    text not null references public.membership_plans(name) on update cascade on delete cascade,
  created_at  timestamptz not null default now(),
  constraint daily_task_templates_weekday_plan_unique unique (weekday, membership_plan_id)
);

create index if not exists daily_task_templates_membership_name_idx on public.daily_task_templates(membership_name);


-- ─── Categorize daily_task_templates by membership plan (upgrade path) ───────
-- The block above already declares the final (weekday, membership_plan_id)
-- schema for a brand-new project. This DO block instead upgrades a database
-- that already ran an older version of this script (where
-- daily_task_templates existed without membership_plan_id and had a plain
-- "one task per weekday" unique constraint) - it backfills every
-- pre-existing (uncategorized) template onto the Free plan, so current Free
-- users keep seeing exactly the same 5 tasks, then swaps the old constraint
-- for the new per-plan one, and seeds the default Free-plan Mon-Fri task
-- set. All of this is a no-op on a fresh project.
--
-- Deliberately a single DO block (not several separate top-level
-- statements) so it can never be partially run - pasting/selecting only
-- part of it is a syntax error rather than a silent partial migration
-- (which previously caused "column membership_plan_id does not exist" if
-- only the INSERT below was run without the preceding ALTER TABLE having
-- executed first in that same session).
--
-- To add a task set for another plan, an admin runs SQL directly, e.g.:
--   insert into public.daily_task_templates (weekday, title, description, reward, membership_plan_id)
--   values (1, 'Premium Monday Task', '...', 40.00,
--     (select id from public.membership_plans where name = 'Premium'));
do $$
declare
  v_free_plan_id uuid;
  v_col_type text;
begin
  select data_type into v_col_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'daily_task_templates' and column_name = 'membership_plan_id';

  if v_col_type is null then
    execute 'alter table public.daily_task_templates add column membership_plan_id uuid references public.membership_plans(id) on delete cascade';
  elsif v_col_type <> 'uuid' then
    -- An earlier/unrelated attempt left this column with the wrong type
    -- (e.g. integer instead of uuid). It only ever holds admin-authored
    -- catalog data (never user data), so it's safe to drop and recreate
    -- with the correct type rather than trying to cast in place.
    execute 'alter table public.daily_task_templates drop column membership_plan_id';
    execute 'alter table public.daily_task_templates add column membership_plan_id uuid references public.membership_plans(id) on delete cascade';
  end if;

  select id into v_free_plan_id from public.membership_plans where name = 'Free' limit 1;

  update public.daily_task_templates
  set membership_plan_id = v_free_plan_id
  where membership_plan_id is null;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'daily_task_templates'
      and column_name = 'membership_plan_id' and is_nullable = 'YES'
  ) then
    execute 'alter table public.daily_task_templates alter column membership_plan_id set not null';
  end if;

  execute 'alter table public.daily_task_templates drop constraint if exists daily_task_templates_weekday_unique';
  execute 'alter table public.daily_task_templates drop constraint if exists daily_task_templates_weekday_plan_unique';
  execute 'alter table public.daily_task_templates add constraint daily_task_templates_weekday_plan_unique unique (weekday, membership_plan_id)';

  execute 'create index if not exists daily_task_templates_plan_id_idx on public.daily_task_templates(membership_plan_id)';

  -- membership_name: denormalized copy of the plan name, kept in sync via
  -- "on update cascade" (so renaming a plan renames it here too) and "on
  -- delete cascade" (so deleting a plan removes its task rows). Requires
  -- membership_plans.name to be unique (added earlier in this script).
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'daily_task_templates' and column_name = 'membership_name'
  ) then
    execute 'alter table public.daily_task_templates add column membership_name text';
  end if;

  update public.daily_task_templates t
  set membership_name = mp.name
  from public.membership_plans mp
  where t.membership_plan_id = mp.id
    and t.membership_name is null;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'daily_task_templates'
      and column_name = 'membership_name' and is_nullable = 'YES'
  ) then
    execute 'alter table public.daily_task_templates alter column membership_name set not null';
  end if;

  execute 'alter table public.daily_task_templates drop constraint if exists daily_task_templates_membership_name_fkey';
  execute 'alter table public.daily_task_templates add constraint daily_task_templates_membership_name_fkey foreign key (membership_name) references public.membership_plans(name) on update cascade on delete cascade';

  execute 'create index if not exists daily_task_templates_membership_name_idx on public.daily_task_templates(membership_name)';

  insert into public.daily_task_templates (weekday, title, description, reward, membership_plan_id, membership_name)
  select v.weekday, v.title, v.description, v.reward, v_free_plan_id, 'Free'
  from (
    values
      (1::smallint, 'Monday Growth Task', 'Join our Telegram channel and refer 3 users to join your earning circle. Upload a screenshot showing you joined + your referral shares as proof.', 20.00::numeric),
      (2::smallint, 'Tuesday Growth Task', 'Share your referral link in 2 WhatsApp groups and follow our official X (Twitter) page. Upload a screenshot of both as proof.', 20.00::numeric),
      (3::smallint, 'Wednesday Growth Task', 'Post about EarnXact on your WhatsApp status and keep it up for the day. Upload a screenshot of your status as proof.', 20.00::numeric),
      (4::smallint, 'Thursday Growth Task', 'Invite 2 new users using your referral link and get them to sign up. Upload a screenshot of your referral count as proof.', 20.00::numeric),
      (5::smallint, 'Friday Growth Task', 'Join our Telegram channel, react to the pinned post, and refer 1 new user. Upload a screenshot as proof.', 20.00::numeric)
  ) as v(weekday, title, description, reward)
  on conflict (weekday, membership_plan_id) do nothing;
end $$;

-- Seeds the 5 Mon-Fri tasks for each paid plan (Free's tasks are seeded
-- above). Reward scales with plan tier; task content/difficulty escalates
-- with the plan's level of responsibility. Safe to re-run - matched
-- against the (weekday, membership_plan_id) constraint, so this only ever
-- inserts rows that don't already exist. To retune reward/title/
-- description afterwards, an admin edits rows directly via SQL.
insert into public.daily_task_templates (weekday, title, description, reward, membership_plan_id, membership_name)
select v.weekday, v.title, v.description, v.reward, mp.id, mp.name
from (
  values
    -- Task class1 (reward 20.00)
    (1::smallint, 'Task Class 1 Monday Task', 'Join the Task Class 1 Telegram group and share your unique referral link with 3 contacts. Upload a screenshot of the shares as proof.', 20.00::numeric, 'Task class1'),
    (2::smallint, 'Task Class 1 Tuesday Task', 'Post your EarnXact referral link on your WhatsApp status and keep it up for at least 6 hours. Upload a screenshot as proof.', 20.00::numeric, 'Task class1'),
    (3::smallint, 'Task Class 1 Wednesday Task', 'Follow EarnXact on Instagram and Facebook, then share our latest post to your timeline. Upload a screenshot of both follows as proof.', 20.00::numeric, 'Task class1'),
    (4::smallint, 'Task Class 1 Thursday Task', 'Refer 1 new member into your Task Class 1 circle and confirm their signup. Upload a screenshot of the referral confirmation.', 20.00::numeric, 'Task class1'),
    (5::smallint, 'Task Class 1 Friday Task', 'Comment on our official Telegram channel''s pinned announcement and tag 2 friends. Upload a screenshot as proof.', 20.00::numeric, 'Task class1'),

    -- Task Class2 (reward 40.00)
    (1::smallint, 'Task Class 2 Monday Task', 'Share your referral link in 3 WhatsApp groups and 1 Telegram group. Upload screenshots of all shares as proof.', 40.00::numeric, 'Task Class2'),
    (2::smallint, 'Task Class 2 Tuesday Task', 'Create a short post about EarnXact on Facebook or Instagram explaining how it works. Upload a screenshot of the published post.', 40.00::numeric, 'Task Class2'),
    (3::smallint, 'Task Class 2 Wednesday Task', 'Refer 2 new users into Task Class 2 and confirm both signups. Upload a screenshot of the referral dashboard showing the new signups.', 40.00::numeric, 'Task Class2'),
    (4::smallint, 'Task Class 2 Thursday Task', 'Post a short WhatsApp status or voice note explaining EarnXact to your contacts. Upload a screenshot of the status/voice note as proof.', 40.00::numeric, 'Task Class2'),
    (5::smallint, 'Task Class 2 Friday Task', 'Engage with 5 posts on EarnXact''s official X (Twitter) page (like, retweet, or comment). Upload a screenshot of your engagement.', 40.00::numeric, 'Task Class2'),

    -- Upscale Class (reward 80.00)
    (1::smallint, 'Upscale Class Monday Task', 'Organize a WhatsApp group of at least 5 contacts and introduce them to EarnXact with your referral link. Upload a screenshot of the group and link share.', 80.00::numeric, 'Upscale Class'),
    (2::smallint, 'Upscale Class Tuesday Task', 'Refer 2 new users into the Upscale Class and help them complete their first task. Upload a screenshot confirming both signups.', 80.00::numeric, 'Upscale Class'),
    (3::smallint, 'Upscale Class Wednesday Task', 'Publish a short review or testimonial about EarnXact on your social media page (Facebook, Instagram, or X). Upload a screenshot of the post.', 80.00::numeric, 'Upscale Class'),
    (4::smallint, 'Upscale Class Thursday Task', 'Share your referral link with 5 contacts across at least 2 different platforms (WhatsApp, Telegram, Facebook, etc). Upload screenshots of each share.', 80.00::numeric, 'Upscale Class'),
    (5::smallint, 'Upscale Class Friday Task', 'Host a mini Q&A session in your WhatsApp or Telegram group answering EarnXact questions from at least 3 people. Upload a screenshot of the conversation.', 80.00::numeric, 'Upscale Class'),

    -- Supervisor Class (reward 200.00)
    (1::smallint, 'Supervisor Class Monday Task', 'Recruit and confirm 3 new referrals into your Supervisor Class network this week. Upload a screenshot of the referral dashboard.', 200.00::numeric, 'Supervisor Class'),
    (2::smallint, 'Supervisor Class Tuesday Task', 'Set up a dedicated WhatsApp or Telegram group for your downline and share EarnXact updates with at least 8 members. Upload a screenshot of the group.', 200.00::numeric, 'Supervisor Class'),
    (3::smallint, 'Supervisor Class Wednesday Task', 'Follow up with 3 of your referrals to confirm they''ve submitted their own daily tasks. Upload a screenshot of the follow-up conversation.', 200.00::numeric, 'Supervisor Class'),
    (4::smallint, 'Supervisor Class Thursday Task', 'Create and share a promotional post (flyer, video, or write-up) about EarnXact across 2 social platforms. Upload screenshots of both posts.', 200.00::numeric, 'Supervisor Class'),
    (5::smallint, 'Supervisor Class Friday Task', 'Host a short training or orientation session (voice note, call, or written guide) for your new referrals on how to use EarnXact. Upload a screenshot of the material shared.', 200.00::numeric, 'Supervisor Class'),

    -- Junior Manager (reward 400.00)
    (1::smallint, 'Junior Manager Monday Task', 'Onboard 3 new referrals into your Junior Manager team and confirm they''ve completed their first task. Upload a screenshot of the team''s progress.', 400.00::numeric, 'Junior Manager'),
    (2::smallint, 'Junior Manager Tuesday Task', 'Host a group call or voice chat with your downline to review weekly goals. Upload a screenshot of the call or chat log.', 400.00::numeric, 'Junior Manager'),
    (3::smallint, 'Junior Manager Wednesday Task', 'Publish a detailed post or short video explaining how EarnXact''s membership plans work, and share it on at least 2 platforms. Upload screenshots of both posts.', 400.00::numeric, 'Junior Manager'),
    (4::smallint, 'Junior Manager Thursday Task', 'Track and report the weekly activity of at least 5 of your referred members (who submitted tasks, who didn''t). Upload a screenshot of your tracking sheet or summary.', 400.00::numeric, 'Junior Manager'),
    (5::smallint, 'Junior Manager Friday Task', 'Recognize and share a shout-out for your top-performing referral this week on your social media. Upload a screenshot of the shout-out post.', 400.00::numeric, 'Junior Manager'),

    -- mid executive (reward 800.00)
    (1::smallint, 'Mid Executive Monday Task', 'Recruit and confirm 4 new referrals into your Mid Executive network this week. Upload a screenshot of the referral dashboard.', 800.00::numeric, 'mid executive'),
    (2::smallint, 'Mid Executive Tuesday Task', 'Prepare and share a weekly performance summary of your downline''s activity across your team''s group chat. Upload a screenshot of the summary.', 800.00::numeric, 'mid executive'),
    (3::smallint, 'Mid Executive Wednesday Task', 'Run a promotional campaign (post, story, or reel) about EarnXact across at least 3 social platforms. Upload screenshots of all 3 posts.', 800.00::numeric, 'mid executive'),
    (4::smallint, 'Mid Executive Thursday Task', 'Mentor 2 of your Supervisor or Junior Manager referrals with a strategy session on growing their own downline. Upload a screenshot of the session or notes.', 800.00::numeric, 'mid executive'),
    (5::smallint, 'Mid Executive Friday Task', 'Submit a written weekly report highlighting your network''s growth, challenges, and next week''s plan. Upload a screenshot or document of the report.', 800.00::numeric, 'mid executive'),

    -- Excecutive (reward 1200.00)
    (1::smallint, 'Executive Monday Task', 'Recruit and confirm 5 new referrals into your Executive network this week. Upload a screenshot of the referral dashboard.', 1200.00::numeric, 'Excecutive'),
    (2::smallint, 'Executive Tuesday Task', 'Host a live session (voice or video call) with your downline to review targets and answer questions. Upload a screenshot of the session.', 1200.00::numeric, 'Excecutive'),
    (3::smallint, 'Executive Wednesday Task', 'Launch a coordinated multi-platform promotion (WhatsApp, Telegram, Facebook, Instagram, X) about EarnXact. Upload screenshots from at least 4 platforms.', 1200.00::numeric, 'Excecutive'),
    (4::smallint, 'Executive Thursday Task', 'Prepare a growth strategy document for your network covering the next 30 days. Upload a screenshot or document of the strategy.', 1200.00::numeric, 'Excecutive'),
    (5::smallint, 'Executive Friday Task', 'Recognize your top 3 performing referrals with a shout-out post and share their results (with permission). Upload a screenshot of the shout-out.', 1200.00::numeric, 'Excecutive'),

    -- Senior Executive (reward 2000.00)
    (1::smallint, 'Senior Executive Monday Task', 'Recruit and confirm 6 new referrals into your Senior Executive network this week. Upload a screenshot of the referral dashboard.', 2000.00::numeric, 'Senior Executive'),
    (2::smallint, 'Senior Executive Tuesday Task', 'Conduct a leadership check-in with all of your Executive/Mid Executive downline members to review their team''s progress. Upload a screenshot of the check-in notes.', 2000.00::numeric, 'Senior Executive'),
    (3::smallint, 'Senior Executive Wednesday Task', 'Produce a promotional video or detailed write-up about EarnXact and share it across at least 4 platforms. Upload screenshots of all shares.', 2000.00::numeric, 'Senior Executive'),
    (4::smallint, 'Senior Executive Thursday Task', 'Submit a comprehensive weekly performance report covering your entire downline''s activity and growth. Upload a screenshot or document of the report.', 2000.00::numeric, 'Senior Executive'),
    (5::smallint, 'Senior Executive Friday Task', 'Host a strategy planning session with your top-tier referrals to set goals for the following week. Upload a screenshot of the session or notes.', 2000.00::numeric, 'Senior Executive'),

    -- Regional Manager (reward 4000.00)
    (1::smallint, 'Regional Manager Monday Task', 'Recruit and confirm 8 new referrals into your Regional Manager network this week. Upload a screenshot of the referral dashboard.', 4000.00::numeric, 'Regional Manager'),
    (2::smallint, 'Regional Manager Tuesday Task', 'Host a regional leadership call with all Senior Executives and Executives under your network to review performance. Upload a screenshot of the call or notes.', 4000.00::numeric, 'Regional Manager'),
    (3::smallint, 'Regional Manager Wednesday Task', 'Launch a full-scale regional promotional campaign about EarnXact across all major social platforms. Upload screenshots from at least 5 platforms.', 4000.00::numeric, 'Regional Manager'),
    (4::smallint, 'Regional Manager Thursday Task', 'Submit a full regional performance report covering growth, retention, and next quarter''s targets. Upload a screenshot or document of the report.', 4000.00::numeric, 'Regional Manager'),
    (5::smallint, 'Regional Manager Friday Task', 'Host a recognition event (call, post, or write-up) celebrating your region''s top performers for the week. Upload a screenshot of the recognition.', 4000.00::numeric, 'Regional Manager')
) as v(weekday, title, description, reward, plan_name)
join public.membership_plans mp on mp.name = v.plan_name
on conflict (weekday, membership_plan_id) do nothing;

alter table public.daily_task_templates enable row level security;

-- Anyone signed in can read the task catalog (needed to render the cards).
-- No insert/update/delete policy for regular users - only ever changed by
-- an admin running SQL directly.
drop policy if exists "Authenticated users can view daily task templates" on public.daily_task_templates;
create policy "Authenticated users can view daily task templates"
  on public.daily_task_templates for select
  to authenticated
  using (true);

-- One submission per user per template per Nigeria-calendar-day. Written
-- exclusively via the SECURITY DEFINER submit_daily_task() function below,
-- which also uploads-credits the reward atomically.
create table if not exists public.task_submissions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  template_id   uuid not null references public.daily_task_templates(id) on delete cascade,
  task_date     date not null,
  status        text not null default 'pending',
  proof_url     text not null,
  reward        numeric(12, 2) not null default 0,
  -- Set to true only by verify_task_submission() (admin, run via SQL) - the
  -- reward is credited at that point, not at submission time. The task
  -- card/calendar only turn green once this is true.
  task_verified boolean not null default false,
  submitted_at  timestamptz not null default now(),
  constraint task_submissions_user_template_date_unique unique (user_id, template_id, task_date)
);

alter table public.task_submissions add column if not exists task_verified boolean not null default false;
alter table public.task_submissions alter column status set default 'pending';


create index if not exists task_submissions_user_id_idx on public.task_submissions(user_id);

alter table public.task_submissions enable row level security;

drop policy if exists "Users can view their own task submissions" on public.task_submissions;
create policy "Users can view their own task submissions"
  on public.task_submissions for select
  using (auth.uid() = user_id);

-- Realtime, so the checkbox on /dashboard/tasks flips to completed
-- immediately across any open tab/device once a submission lands.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'task_submissions'
  ) then
    alter publication supabase_realtime add table public.task_submissions;
  end if;
end $$;

-- REPLICA IDENTITY FULL is required for postgres_changes UPDATE events to
-- reliably include every column (not just the primary key) in the payload -
-- without this, an admin's verify_task_submission() UPDATE (task_verified
-- true, status completed) can silently fail to deliver a usable "new" row
-- to the client's Realtime subscription, forcing a manual page refresh to
-- see the change. Safe/cheap on this small table.
alter table public.task_submissions replica identity full;

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists users_mission_user_id_idx on public.users_mission(user_id);
create index if not exists watch_videos_user_id_idx on public.watch_videos(user_id);
create index if not exists referrals_referrer_id_idx on public.referrals(referrer_id);
create index if not exists daily_checkins_user_id_idx on public.daily_checkins(user_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table public.user_profile enable row level security;
alter table public.membership_plans enable row level security;
alter table public.transactions enable row level security;
alter table public.users_mission enable row level security;
alter table public.watch_videos enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_data enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.checkin_settings enable row level security;

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

-- Users can only see their own check-in history. No insert/update/delete
-- policy is defined for regular users - all writes happen exclusively via
-- the SECURITY DEFINER claim_daily_checkin() function below.
drop policy if exists "Users can view their own check-ins" on public.daily_checkins;
create policy "Users can view their own check-ins"
  on public.daily_checkins for select
  using (auth.uid() = user_id);

-- Any signed-in user can read the current reward price (so the client can
-- display "Claim ₦10" before claiming). No insert/update/delete policy for
-- regular users - only ever changed by an admin running SQL directly.
drop policy if exists "Authenticated users can view checkin settings" on public.checkin_settings;
create policy "Authenticated users can view checkin settings"
  on public.checkin_settings for select
  to authenticated
  using (true);

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
  -- Every new user starts on the Free plan so the Tasks page has a
  -- membership_plan_id to filter daily_task_templates by from day one
  -- (without this, membership_plan_id stays null and the Tasks page never
  -- loads any task cards for the user).
  v_free_plan_id uuid;
begin
  select id into v_free_plan_id from public.membership_plans where name = 'Free' limit 1;
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
        referral_code, referred_by_id, user_referral_link, membership_plan_id
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
        v_site_url || '/signup?ref=' || v_new_referral_code,
        v_free_plan_id
      )
      on conflict (user_id) do update
        set first_name = excluded.first_name,
            last_name = excluded.last_name,
            email = excluded.email,
            phone_num = excluded.phone_num,
            account_type = excluded.account_type,
            membership_plan_id = coalesce(public.user_profile.membership_plan_id, excluded.membership_plan_id),
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
-- Claims every one of the caller's own unclaimed referrals (referrals.referral_claim = false)
-- in one shot: flips referral_claim to true, credits the total reward into
-- user_profile.wallet_balance, logs a single 'bonus' transaction, and resets
-- the realtime referral_data.referral_balance to 0. There is no minimum -
-- even a single 50.00 referral reward is claimable right away.
create or replace function public.claim_referral_balance()
returns table(claimed_amount numeric, new_wallet_balance numeric)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_total numeric(12, 2);
  v_count int;
  v_new_wallet numeric(12, 2);
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Atomically flip every currently-unclaimed referral for this referrer to
  -- claimed, and capture exactly the rows this statement affected. A
  -- concurrent second claim attempt will find zero matching rows (already
  -- claimed), so it can never double-credit the same referral.
  with claimed as (
    update public.referrals
    set referral_claim = true
    where referrer_id = v_user_id
      and referral_claim = false
    returning reward_amount
  )
  select coalesce(sum(reward_amount), 0), count(*) into v_total, v_count from claimed;

  if v_total <= 0 then
    raise exception 'No unclaimed referral rewards to claim';
  end if;

  update public.user_profile
  set wallet_balance = wallet_balance + v_total,
      updated_at = now()
  where user_id = v_user_id
  returning wallet_balance into v_new_wallet;

  insert into public.transactions (user_id, type, amount, status, reference, description)
  values (
    v_user_id,
    'bonus',
    v_total,
    'completed',
    'referral_claim',
    'Referral bonus claim (' || v_count || ' referral' || (case when v_count = 1 then '' else 's' end) || ')'
  );

  update public.referral_data
  set referral_balance = 0,
      last_claim_date = now(),
      updated_at = now()
  where user_id = v_user_id;

  return query select v_total, v_new_wallet;
end;
$$;

grant execute on function public.claim_referral_balance() to authenticated;

-- ─── Claim daily check-in ────────────────────────────────────────────────────
-- Claims *today's* check-in reward (Nigeria/Africa-Lagos calendar day, not
-- UTC), once per day per user. Computes the new streak by looking at the
-- caller's own most recent check-in: if it was exactly yesterday (Nigeria
-- time), the streak continues (+1); otherwise it resets to 1. Credits the
-- current checkin_settings.reward_price into user_profile.wallet_balance
-- and logs a 'bonus' transaction, same pattern as claim_referral_balance().
create or replace function public.claim_daily_checkin()
returns table(streak integer, reward numeric, new_wallet_balance numeric, check_in_date date)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (now() at time zone 'Africa/Lagos')::date;
  v_device_id text;
  v_reward_price numeric(12, 2);
  v_last_date date;
  v_last_streak integer;
  v_new_streak integer;
  v_new_wallet numeric(12, 2);
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if exists (
    select 1 from public.daily_checkins dc
    where dc.user_id = v_user_id and dc.check_in_date = v_today
  ) then
    raise exception 'You have already checked in today';
  end if;

  select coalesce(registered_device_id, 'web') into v_device_id
  from public.user_profile
  where user_id = v_user_id;

  select reward_price into v_reward_price from public.checkin_settings where id = true;
  v_reward_price := coalesce(v_reward_price, 10.00);

  -- Most recent check-in this user has ever made (any date), used purely
  -- to decide whether today continues the streak or starts a new one.
  -- Table alias (dc) is required here: without it, "check_in_date"/"streak"
  -- are ambiguous between the daily_checkins columns and this function's
  -- own "returns table(...)" output columns of the same names.
  select dc.check_in_date, dc.streak into v_last_date, v_last_streak
  from public.daily_checkins dc
  where dc.user_id = v_user_id
  order by dc.check_in_date desc
  limit 1;

  if v_last_date = v_today - 1 then
    v_new_streak := v_last_streak + 1;
  else
    v_new_streak := 1;
  end if;

  begin
    insert into public.daily_checkins (user_id, device_id, check_in_date, streak, reward)
    values (v_user_id, coalesce(v_device_id, 'web'), v_today, v_new_streak, v_reward_price);
  exception
    when unique_violation then
      -- Lost a race against a concurrent claim for the same day.
      raise exception 'You have already checked in today';
  end;

  update public.user_profile
  set wallet_balance = wallet_balance + v_reward_price,
      updated_at = now()
  where user_id = v_user_id
  returning wallet_balance into v_new_wallet;

  insert into public.transactions (user_id, type, amount, status, reference, description)
  values (
    v_user_id,
    'bonus',
    v_reward_price,
    'completed',
    'daily_checkin',
    'Daily check-in reward (day ' || v_new_streak || ' streak)'
  );

  return query select v_new_streak, v_reward_price, v_new_wallet, v_today;
end;
$$;

grant execute on function public.claim_daily_checkin() to authenticated;

-- ─── Submit a daily task ──────────────────────────────────────────────────────
-- Submits proof for *today's* Mon-Fri task (Nigeria/Africa-Lagos calendar
-- day), once per user per template per day (enforced by
-- task_submissions_user_template_date_unique). Rejects submissions for a
-- template that isn't today's weekday, or a second submission for the same
-- day. Records the submission as 'pending' (task_verified = false) - the
-- reward is only credited once an admin verifies it via
-- verify_task_submission() below, not at submission time.
create or replace function public.submit_daily_task(p_template_id uuid, p_proof_url text)
returns table(status text, reward numeric, new_wallet_balance numeric)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (now() at time zone 'Africa/Lagos')::date;
  v_weekday smallint := extract(isodow from ((now() at time zone 'Africa/Lagos')::date))::smallint;
  v_template_weekday smallint;
  v_template_title text;
  v_reward numeric(12, 2);
  v_is_active boolean;
  v_current_wallet numeric(12, 2);
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_proof_url is null or length(trim(p_proof_url)) = 0 then
    raise exception 'Proof screenshot is required';
  end if;

  select dtt.weekday, dtt.title, dtt.reward, dtt.is_active
  into v_template_weekday, v_template_title, v_reward, v_is_active
  from public.daily_task_templates dtt
  where dtt.id = p_template_id;

  if v_template_weekday is null then
    raise exception 'Task not found';
  end if;

  if not v_is_active then
    raise exception 'This task is not currently available';
  end if;

  if v_template_weekday <> v_weekday then
    raise exception 'This task is not available today';
  end if;

  begin
    insert into public.task_submissions (user_id, template_id, task_date, status, proof_url, reward, task_verified)
    values (v_user_id, p_template_id, v_today, 'pending', p_proof_url, v_reward, false);
  exception
    when unique_violation then
      raise exception 'You have already submitted today''s task';
  end;

  select wallet_balance into v_current_wallet
  from public.user_profile
  where user_id = v_user_id;

  return query select 'pending'::text, v_reward, v_current_wallet;
end;
$$;

grant execute on function public.submit_daily_task(uuid, text) to authenticated;

-- ─── Verify a task submission (admin-only) ────────────────────────────────────
-- Not granted to `authenticated` - only callable by an admin running SQL
-- directly in the Supabase SQL Editor (same convention as editing
-- checkin_settings/daily_task_templates/mission_catalog), e.g.:
--   select * from public.verify_task_submission('<task_submissions.id>');
-- Flips task_verified to true and credits the reward exactly once - a
-- second call for an already-verified submission raises an exception
-- instead of double-crediting.
create or replace function public.verify_task_submission(p_submission_id uuid)
returns table(status text, reward numeric, new_wallet_balance numeric)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid;
  v_reward numeric(12, 2);
  v_already_verified boolean;
  v_template_title text;
  v_new_wallet numeric(12, 2);
begin
  select ts.user_id, ts.reward, ts.task_verified, dtt.title
  into v_user_id, v_reward, v_already_verified, v_template_title
  from public.task_submissions ts
  join public.daily_task_templates dtt on dtt.id = ts.template_id
  where ts.id = p_submission_id;

  if v_user_id is null then
    raise exception 'Task submission not found';
  end if;

  if v_already_verified then
    raise exception 'This task submission has already been verified';
  end if;

  update public.task_submissions
  set task_verified = true,
      status = 'completed'
  where id = p_submission_id;

  update public.user_profile
  set wallet_balance = wallet_balance + v_reward,
      updated_at = now()
  where user_id = v_user_id
  returning wallet_balance into v_new_wallet;

  insert into public.transactions (user_id, type, amount, status, reference, description)
  values (
    v_user_id,
    'bonus',
    v_reward,
    'completed',
    'daily_task',
    'Daily task reward: ' || v_template_title
  );

  return query select 'completed'::text, v_reward, v_new_wallet;
end;
$$;

-- ─── Mission progress + claiming ──────────────────────────────────────────────
-- Returns the current user's live progress against every active row in
-- mission_catalog, computed straight from offerwall_transactions - the
-- client never computes/trusts its own progress numbers.
create or replace function public.get_mission_status()
returns table(
  mission_id text,
  period text,
  progress numeric,
  goal_target numeric,
  reward numeric,
  completed boolean,
  claimed boolean
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_daily_start timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  v_weekly_start timestamptz := date_trunc('week', now() at time zone 'utc') at time zone 'utc';
  v_daily_key text := to_char(now() at time zone 'utc', 'YYYY-MM-DD');
  v_weekly_key text := to_char(now() at time zone 'utc', 'IYYY-"W"IW');
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  return query
  with progress_calc as (
    select
      mc.mission_id,
      mc.period::text as period,
      mc.goal_target,
      mc.reward,
      (case mc.period::text when 'daily' then v_daily_key else v_weekly_key end) as period_key,
      (case mc.goal_type
        when 'provider_amount' then coalesce((
          select sum(ot.amount) from public.offerwall_transactions ot
          where ot.user_id = v_user_id and ot.provider = mc.goal_provider and ot.status = 'credited'
            and ot.credited_at >= (case mc.period::text when 'daily' then v_daily_start else v_weekly_start end)
        ), 0)
        when 'distinct_providers' then coalesce((
          select count(distinct ot.provider)::numeric from public.offerwall_transactions ot
          where ot.user_id = v_user_id and ot.status = 'credited'
            and ot.credited_at >= (case mc.period::text when 'daily' then v_daily_start else v_weekly_start end)
        ), 0)
        when 'wall_total_amount' then coalesce((
          select sum(ot.amount) from public.offerwall_transactions ot
          where ot.user_id = v_user_id and ot.status = 'credited'
            and ot.credited_at >= (case mc.period::text when 'daily' then v_daily_start else v_weekly_start end)
        ), 0)
        else 0
      end) as progress
    from public.mission_catalog mc
    where mc.is_active
  )
  select
    pc.mission_id,
    pc.period,
    pc.progress,
    pc.goal_target,
    pc.reward,
    pc.progress >= pc.goal_target as completed,
    exists (
      select 1 from public.users_mission um
      where um.user_id = v_user_id and um.mission_id = pc.mission_id and um.period_key = pc.period_key
    ) as claimed
  from progress_calc pc;
end;
$$;

grant execute on function public.get_mission_status() to authenticated;

-- Re-verifies a mission's goal server-side (never trusts the client) and,
-- if met, atomically records the claim and credits the reward. Blocked by
-- users_mission_user_mission_period_unique if this mission/window was
-- already claimed.
create or replace function public.claim_mission(p_mission_id text)
returns table(reward numeric, new_wallet_balance numeric)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_daily_start timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  v_weekly_start timestamptz := date_trunc('week', now() at time zone 'utc') at time zone 'utc';
  v_daily_key text := to_char(now() at time zone 'utc', 'YYYY-MM-DD');
  v_weekly_key text := to_char(now() at time zone 'utc', 'IYYY-"W"IW');
  v_period mission_period;
  v_goal_type text;
  v_goal_provider text;
  v_goal_target numeric;
  v_reward numeric;
  v_is_active boolean;
  v_period_key text;
  v_window_start timestamptz;
  v_progress numeric;
  v_new_wallet numeric(12, 2);
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select mc.period, mc.goal_type, mc.goal_provider, mc.goal_target, mc.reward, mc.is_active
  into v_period, v_goal_type, v_goal_provider, v_goal_target, v_reward, v_is_active
  from public.mission_catalog mc
  where mc.mission_id = p_mission_id;

  if v_period is null then
    raise exception 'Mission not found';
  end if;

  if not v_is_active then
    raise exception 'This mission is not currently available';
  end if;

  v_period_key := case v_period::text when 'daily' then v_daily_key else v_weekly_key end;
  v_window_start := case v_period::text when 'daily' then v_daily_start else v_weekly_start end;

  if v_goal_type = 'provider_amount' then
    select coalesce(sum(ot.amount), 0) into v_progress
    from public.offerwall_transactions ot
    where ot.user_id = v_user_id and ot.provider = v_goal_provider and ot.status = 'credited'
      and ot.credited_at >= v_window_start;
  elsif v_goal_type = 'distinct_providers' then
    select coalesce(count(distinct ot.provider), 0) into v_progress
    from public.offerwall_transactions ot
    where ot.user_id = v_user_id and ot.status = 'credited' and ot.credited_at >= v_window_start;
  elsif v_goal_type = 'wall_total_amount' then
    select coalesce(sum(ot.amount), 0) into v_progress
    from public.offerwall_transactions ot
    where ot.user_id = v_user_id and ot.status = 'credited' and ot.credited_at >= v_window_start;
  else
    raise exception 'Unknown mission goal type';
  end if;

  if v_progress < v_goal_target then
    raise exception 'Mission goal not reached yet';
  end if;

  begin
    insert into public.users_mission (user_id, mission_id, period, period_key, status, progress, reward, completed_at)
    values (v_user_id, p_mission_id, v_period, v_period_key, 'claimed', v_progress::int, v_reward, now());
  exception
    when unique_violation then
      raise exception 'Mission already claimed for this period';
  end;

  update public.user_profile
  set wallet_balance = wallet_balance + v_reward,
      updated_at = now()
  where user_id = v_user_id
  returning wallet_balance into v_new_wallet;

  insert into public.transactions (user_id, type, amount, status, reference, description)
  values (v_user_id, 'bonus', v_reward, 'completed', 'mission:' || p_mission_id, 'Mission reward: ' || p_mission_id);

  return query select v_reward, v_new_wallet;
end;
$$;

grant execute on function public.claim_mission(text) to authenticated;

-- ─── Offerwall postback crediting (service-role only) ─────────────────────────
-- Atomically adjusts wallet_balance by p_amount (positive to credit, negative
-- to reverse) and logs a matching transactions row. Takes p_user_id as a
-- plain argument rather than reading auth.uid(), because it's called from
-- server-to-server postback routes (e.g. /api/postbacks/cpx) that have no
-- Supabase session - only a service-role key and a provider-supplied user
-- id. Because it trusts p_user_id completely, it must NEVER be granted to
-- `authenticated` (see revoke below) - only the service role calls this.
create or replace function public.credit_offerwall_transaction(
  p_user_id uuid,
  p_amount numeric,
  p_reference text,
  p_description text
)
returns numeric
language plpgsql
security definer set search_path = public
as $$
declare
  v_new_wallet numeric(12, 2);
begin
  update public.user_profile
  set wallet_balance = wallet_balance + p_amount,
      updated_at = now()
  where user_id = p_user_id
  returning wallet_balance into v_new_wallet;

  if v_new_wallet is null then
    raise exception 'User profile not found';
  end if;

  insert into public.transactions (user_id, type, amount, status, reference, description)
  values (
    p_user_id,
    case when p_amount >= 0 then 'bonus' else 'debit' end,
    abs(p_amount),
    'completed',
    p_reference,
    p_description
  );

  return v_new_wallet;
end;
$$;

revoke all on function public.credit_offerwall_transaction(uuid, numeric, text, text) from public;
revoke all on function public.credit_offerwall_transaction(uuid, numeric, text, text) from authenticated;
grant execute on function public.credit_offerwall_transaction(uuid, numeric, text, text) to service_role;
