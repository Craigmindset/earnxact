-- EarnXact: personal notifications + "notify me" withdrawal reminders +
-- per-user notification dismissals (delete/clear on /dashboard/notifications).
-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query).
--
-- Adds 3 new tables + 2 SECURITY DEFINER functions. No existing table is
-- modified. Safe to re-run any time - every statement is guarded (IF NOT
-- EXISTS / CREATE OR REPLACE), no destructive reset block.
--
--   - public.user_notifications: personal, per-user notification items
--     (distinct from public.admin_notifications, which is a global
--     broadcast everyone sees). Currently only ever written to by
--     request_withdrawal_reminder()/claim_due_withdrawal_reminders() below,
--     but is a general-purpose personal feed table going forward.
--   - public.withdrawal_notify_requests: one row per user who has tapped
--     "Notify me" on /dashboard/wallet while the Friday withdrawal window
--     is closed. Cleared automatically once claim_due_withdrawal_reminders()
--     fires their reminder.
--   - public.notification_dismissals: lets a user "delete"/"clear" an item
--     from their /dashboard/notifications feed WITHOUT touching the
--     underlying record - transactions/admin_notifications are financial/
--     shared records that must never be deletable by a client (an OWASP
--     "missing audit trail" risk otherwise), so dismissing just hides the
--     item client-side for that user via this per-user marker table.
--     `item_key` is a composite string like 'activity:<transaction_id>',
--     'announcement:<admin_notification_id>' or 'personal:<user_notification_id>'.

-- ─── 1. user_notifications ─────────────────────────────────────────────────
create table if not exists public.user_notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  message    text not null,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_user_id_idx on public.user_notifications(user_id);

alter table public.user_notifications enable row level security;

-- No insert/update/delete policy for regular users - only ever written by
-- the SECURITY DEFINER functions below, the same pattern used everywhere
-- else in this app (task_submissions, offerwall_transactions, etc.).
drop policy if exists "Users can view their own notifications" on public.user_notifications;
create policy "Users can view their own notifications"
  on public.user_notifications for select
  using (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_notifications'
  ) then
    alter publication supabase_realtime add table public.user_notifications;
  end if;
end $$;

-- ─── 2. withdrawal_notify_requests ──────────────────────────────────────────
create table if not exists public.withdrawal_notify_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.withdrawal_notify_requests enable row level security;

-- Lets the wallet page show "Reminder set" (vs. "Notify me") after a
-- refresh - written only via request_withdrawal_reminder()/
-- claim_due_withdrawal_reminders() below.
drop policy if exists "Users can view their own withdrawal reminder request" on public.withdrawal_notify_requests;
create policy "Users can view their own withdrawal reminder request"
  on public.withdrawal_notify_requests for select
  using (auth.uid() = user_id);

-- ─── 3. notification_dismissals ─────────────────────────────────────────────
create table if not exists public.notification_dismissals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  item_key   text not null,
  created_at timestamptz not null default now(),
  unique (user_id, item_key)
);

alter table public.notification_dismissals enable row level security;

drop policy if exists "Users can view their own notification dismissals" on public.notification_dismissals;
create policy "Users can view their own notification dismissals"
  on public.notification_dismissals for select
  using (auth.uid() = user_id);

-- Unlike every other write path in this app, a direct client insert is
-- fine here (`with check` still pins it to the caller's own user_id) -
-- dismissing is inert UI state, not a business rule or financial record.
drop policy if exists "Users can dismiss their own notifications" on public.notification_dismissals;
create policy "Users can dismiss their own notifications"
  on public.notification_dismissals for insert
  with check (auth.uid() = user_id);

-- ─── 4. request_withdrawal_reminder() ───────────────────────────────────────
-- Called when a user taps "Notify me" on /dashboard/wallet while it isn't
-- Friday yet. Upserts their standing request and immediately posts a
-- confirmation into their personal feed.
create or replace function public.request_withdrawal_reminder()
returns void
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.withdrawal_notify_requests (user_id)
  values (v_user_id)
  on conflict (user_id) do update set created_at = now();

  insert into public.user_notifications (user_id, title, message)
  values (
    v_user_id,
    'Reminder set',
    'We''ll notify you right here the moment withdrawals open again (next Friday).'
  );
end;
$$;

grant execute on function public.request_withdrawal_reminder() to authenticated;

-- ─── 5. claim_due_withdrawal_reminders() ────────────────────────────────────
-- Self-serve "cron": since this app has no background job runner, this is
-- called on-load from /dashboard/wallet and /dashboard/notifications for
-- the current user only. It's a no-op unless (a) it's currently Friday
-- (Africa/Lagos) and (b) that specific user has a pending reminder request -
-- so it's safe/cheap to call on every page load.
create or replace function public.claim_due_withdrawal_reminders()
returns void
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_deleted_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if extract(dow from (now() at time zone 'Africa/Lagos')) <> 5 then
    return;
  end if;

  delete from public.withdrawal_notify_requests
  where user_id = v_user_id
  returning id into v_deleted_id;

  if v_deleted_id is not null then
    insert into public.user_notifications (user_id, title, message)
    values (
      v_user_id,
      'Withdrawals are open',
      'It''s Friday - you can now request a withdrawal from your wallet.'
    );
  end if;
end;
$$;

grant execute on function public.claim_due_withdrawal_reminders() to authenticated;
