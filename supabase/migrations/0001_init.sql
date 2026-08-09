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

-- Seeds a default "Free" plan every user starts on, so
-- user_profile.membership_plan_id always resolves to a real row (rather
-- than being null / showing a blank category). Safe to re-run - only
-- inserts if a plan with this exact name doesn't already exist.
insert into public.membership_plans (name, amount, description, is_available)
select 'Free', 0, 'The default EarnXact membership - upgrade anytime for higher payouts.', true
where not exists (select 1 from public.membership_plans where name = 'Free');

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
create table if not exists public.daily_task_templates (
  id          uuid primary key default gen_random_uuid(),
  weekday     smallint not null check (weekday between 1 and 5),
  title       text not null,
  description text not null,
  reward      numeric(12, 2) not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint daily_task_templates_weekday_unique unique (weekday)
);

insert into public.daily_task_templates (weekday, title, description, reward)
values
  (1, 'Monday Growth Task', 'Join our Telegram channel and refer 3 users to join your earning circle. Upload a screenshot showing you joined + your referral shares as proof.', 20.00),
  (2, 'Tuesday Growth Task', 'Share your referral link in 2 WhatsApp groups and follow our official X (Twitter) page. Upload a screenshot of both as proof.', 20.00),
  (3, 'Wednesday Growth Task', 'Post about EarnXact on your WhatsApp status and keep it up for the day. Upload a screenshot of your status as proof.', 20.00),
  (4, 'Thursday Growth Task', 'Invite 2 new users using your referral link and get them to sign up. Upload a screenshot of your referral count as proof.', 20.00),
  (5, 'Friday Growth Task', 'Join our Telegram channel, react to the pinned post, and refer 1 new user. Upload a screenshot as proof.', 20.00)
on conflict (weekday) do nothing;

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
  status        text not null default 'completed',
  proof_url     text not null,
  reward        numeric(12, 2) not null default 0,
  submitted_at  timestamptz not null default now(),
  constraint task_submissions_user_template_date_unique unique (user_id, template_id, task_date)
);

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
-- day. Credits the template's reward into user_profile.wallet_balance and
-- logs a 'bonus' transaction, same pattern as claim_daily_checkin().
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
  v_new_wallet numeric(12, 2);
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
    insert into public.task_submissions (user_id, template_id, task_date, status, proof_url, reward)
    values (v_user_id, p_template_id, v_today, 'completed', p_proof_url, v_reward);
  exception
    when unique_violation then
      raise exception 'You have already submitted today''s task';
  end;

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

grant execute on function public.submit_daily_task(uuid, text) to authenticated;
