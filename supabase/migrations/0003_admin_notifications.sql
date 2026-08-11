-- EarnXact: admin-broadcast notifications
-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query).
--
-- Safe to re-run any time, on any database state - every statement here is
-- guarded (IF NOT EXISTS / WHERE NOT EXISTS), so re-running never deletes or
-- duplicates anything. This file has NO destructive "reset" block and only
-- ever adds/updates the single new object listed below:
--   - public.admin_notifications: global announcements an admin posts (via
--     SQL) that every signed-in user sees on /dashboard/notifications,
--     alongside their own personal activity from public.transactions.
--
-- No user data (user_profile, transactions, referrals, task_submissions,
-- etc.) is touched by this file at all.

create table if not exists public.admin_notifications (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  message    text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists admin_notifications_created_at_idx
  on public.admin_notifications(created_at desc);

alter table public.admin_notifications enable row level security;

-- Every signed-in user can read active broadcasts - there's no per-user
-- targeting, so no `user_id` column/ownership check is needed here (unlike
-- transactions, which are scoped with `auth.uid() = user_id`).
drop policy if exists "Authenticated users can view active admin notifications" on public.admin_notifications;
create policy "Authenticated users can view active admin notifications"
  on public.admin_notifications for select
  to authenticated
  using (is_active = true);

-- Let the notifications page live-update the instant an admin posts a new
-- broadcast, the same way offerwall_transactions/task_submissions already do.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'admin_notifications'
  ) then
    alter publication supabase_realtime add table public.admin_notifications;
  end if;
end $$;

-- One-time welcome broadcast so the page isn't empty on a fresh install.
-- An admin manages further announcements directly via SQL, e.g.:
--   insert into public.admin_notifications (title, message) values ('Title', 'Message here.');
--   update public.admin_notifications set is_active = false where id = '...'; -- to retire one
insert into public.admin_notifications (title, message)
select 'Welcome to EarnXact', 'Thanks for joining EarnXact! Complete your daily tasks to start earning.'
where not exists (select 1 from public.admin_notifications where title = 'Welcome to EarnXact');
