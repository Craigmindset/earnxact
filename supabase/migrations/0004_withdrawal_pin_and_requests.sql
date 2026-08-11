-- EarnXact: withdrawal PIN + withdrawal requests
-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query).
--
-- Safe to re-run any time, on any database state - every statement here is
-- guarded (IF NOT EXISTS / CREATE OR REPLACE), so re-running never deletes
-- or duplicates anything. This file has NO destructive "reset" block and
-- only ever adds/updates the objects listed below:
--   - public.user_profile.pin_hash: the user's 4-digit withdrawal PIN,
--     stored ONLY as a pgcrypto bcrypt hash (crypt(pin, gen_salt('bf'))) -
--     the raw PIN is never written to the database anywhere, and the hash
--     itself is never read back by client code (only compared server-side
--     inside the SECURITY DEFINER functions below).
--   - public.withdrawal_requests: one row per withdrawal a user initiates
--     from /dashboard/wallet, admin-managed status (processing -> paid /
--     completed) via SQL.
--   - 4 SECURITY DEFINER functions: has_withdrawal_pin(), set_withdrawal_pin(),
--     reset_withdrawal_pin(), create_withdrawal_request() - all the only
--     way pin_hash / withdrawal_requests are ever written to, so a client
--     can never bypass PIN verification or fake a withdrawal.
--
-- No other user data (transactions history, referrals, task_submissions,
-- etc.) is touched by this file, other than inserting a 'withdrawal'
-- transactions row as part of create_withdrawal_request() below (the same
-- table every other reward/claim function already writes to).

create extension if not exists "pgcrypto";

-- ─── 1. user_profile.pin_hash ─────────────────────────────────────────────────
alter table public.user_profile add column if not exists pin_hash text;

-- ─── 2. withdrawal_requests ───────────────────────────────────────────────────
-- Deliberately has NO raw/hashed "pin" column - the PIN's only purpose is a
-- one-time authorization check at request time (done inside
-- create_withdrawal_request() below), not something worth persisting
-- per-row. Storing it again here (even hashed) would just duplicate
-- user_profile.pin_hash and needlessly widen the blast radius if this table
-- were ever compromised - an OWASP "sensitive data exposure" anti-pattern.
-- "time"/"date" are likewise a single timestamptz (created_at) rather than
-- two separate columns - splitting a single point-in-time value into two
-- redundant columns is unnecessary (the app derives both from created_at).
create table if not exists public.withdrawal_requests (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  status            text not null default 'processing' check (status in ('processing', 'completed', 'paid')),
  -- Wallet balance *before* this withdrawal's amount was deducted (a
  -- point-in-time snapshot for support/audit purposes - not a live value).
  wallet_balance    numeric(12, 2) not null,
  amount_withdrawn  numeric(12, 2) not null check (amount_withdrawn > 0),
  bank_name         text not null,
  account_name      text not null,
  account_number    text not null,
  created_at        timestamptz not null default now()
);

create index if not exists withdrawal_requests_user_id_idx on public.withdrawal_requests(user_id);

alter table public.withdrawal_requests enable row level security;

-- Users can see their own withdrawal history; all writes happen only
-- through create_withdrawal_request() (SECURITY DEFINER, bypasses RLS) -
-- there is deliberately no insert/update policy for authenticated clients,
-- the same pattern used by offerwall_transactions/task_submissions.
drop policy if exists "Users can view their own withdrawal requests" on public.withdrawal_requests;
create policy "Users can view their own withdrawal requests"
  on public.withdrawal_requests for select
  using (auth.uid() = user_id);

-- Lets the wallet/notifications pages reflect an admin's status update
-- (processing -> paid/completed) live, the same way other tables here do.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'withdrawal_requests'
  ) then
    alter publication supabase_realtime add table public.withdrawal_requests;
  end if;
end $$;

-- ─── 3. has_withdrawal_pin() ──────────────────────────────────────────────────
-- Lets the client check "does this user have a PIN yet?" (to decide whether
-- to show the Set PIN or Reset PIN form) without ever selecting pin_hash
-- itself over the wire.
create or replace function public.has_withdrawal_pin()
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  return exists (
    select 1 from public.user_profile where user_id = v_user_id and pin_hash is not null
  );
end;
$$;

grant execute on function public.has_withdrawal_pin() to authenticated;

-- ─── 4. set_withdrawal_pin() ──────────────────────────────────────────────────
-- First-time PIN creation only - raises if a PIN already exists (use
-- reset_withdrawal_pin() to change an existing one instead).
create or replace function public.set_withdrawal_pin(p_pin text)
returns void
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN must be exactly 4 digits.';
  end if;

  select pin_hash into v_existing from public.user_profile where user_id = v_user_id;

  if v_existing is not null then
    raise exception 'A PIN is already set. Use reset instead.';
  end if;

  update public.user_profile
  set pin_hash = crypt(p_pin, gen_salt('bf')),
      updated_at = now()
  where user_id = v_user_id;
end;
$$;

grant execute on function public.set_withdrawal_pin(text) to authenticated;

-- ─── 5. reset_withdrawal_pin() ────────────────────────────────────────────────
-- Requires the current PIN to be supplied and verified before allowing a
-- change - prevents anyone with just a logged-in session (e.g. a stolen
-- cookie) from silently taking over withdrawal authorization.
create or replace function public.reset_withdrawal_pin(p_current_pin text, p_new_pin text)
returns void
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_current_pin !~ '^[0-9]{4}$' or p_new_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN must be exactly 4 digits.';
  end if;

  select pin_hash into v_existing from public.user_profile where user_id = v_user_id;

  if v_existing is null then
    raise exception 'No PIN set yet. Please set a PIN first.';
  end if;

  if crypt(p_current_pin, v_existing) <> v_existing then
    raise exception 'Current PIN is incorrect.';
  end if;

  update public.user_profile
  set pin_hash = crypt(p_new_pin, gen_salt('bf')),
      updated_at = now()
  where user_id = v_user_id;
end;
$$;

grant execute on function public.reset_withdrawal_pin(text, text) to authenticated;

-- ─── 6. create_withdrawal_request() ───────────────────────────────────────────
-- The only way a withdrawal_requests row (or a 'withdrawal' transactions
-- row) gets created. Verifies the PIN server-side, checks/locks the
-- wallet balance (`for update` prevents a double-withdrawal race from two
-- concurrent requests), debits the wallet immediately (funds are held
-- while the request is processing), then records both an audit row in
-- withdrawal_requests and a matching entry in transactions so it shows up
-- on /dashboard/notifications right away.
create or replace function public.create_withdrawal_request(
  p_amount numeric,
  p_bank_name text,
  p_account_name text,
  p_account_number text,
  p_pin text
)
returns table(request_id uuid, new_wallet_balance numeric)
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_pin_hash text;
  v_balance numeric(12, 2);
  v_new_balance numeric(12, 2);
  v_request_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN must be exactly 4 digits.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter a valid withdrawal amount.';
  end if;

  if p_bank_name is null or length(trim(p_bank_name)) = 0 then
    raise exception 'Bank name is required.';
  end if;

  if p_account_name is null or length(trim(p_account_name)) = 0 then
    raise exception 'Account name is required.';
  end if;

  if p_account_number !~ '^[0-9]{10}$' then
    raise exception 'Enter a valid 10-digit account number.';
  end if;

  select wallet_balance, pin_hash into v_balance, v_pin_hash
  from public.user_profile
  where user_id = v_user_id
  for update;

  if v_pin_hash is null then
    raise exception 'Please set a withdrawal PIN first.';
  end if;

  if crypt(p_pin, v_pin_hash) <> v_pin_hash then
    raise exception 'Incorrect PIN.';
  end if;

  if p_amount > v_balance then
    raise exception 'Insufficient wallet balance.';
  end if;

  update public.user_profile
  set wallet_balance = wallet_balance - p_amount,
      updated_at = now()
  where user_id = v_user_id
  returning wallet_balance into v_new_balance;

  insert into public.withdrawal_requests (
    user_id, status, wallet_balance, amount_withdrawn, bank_name, account_name, account_number
  )
  values (v_user_id, 'processing', v_balance, p_amount, p_bank_name, p_account_name, p_account_number)
  returning id into v_request_id;

  insert into public.transactions (user_id, type, amount, status, reference, description)
  values (
    v_user_id,
    'withdrawal',
    p_amount,
    'pending',
    v_request_id::text,
    'Withdrawal to ' || p_bank_name || ' (****' || right(p_account_number, 4) || ')'
  );

  return query select v_request_id, v_new_balance;
end;
$$;

grant execute on function public.create_withdrawal_request(numeric, text, text, text, text) to authenticated;
