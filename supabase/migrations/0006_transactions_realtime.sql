-- EarnXact: add public.transactions to the Supabase realtime publication.
-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query).
--
-- Without this, postgres_changes subscriptions on public.transactions
-- (used by /dashboard/notifications and the new "Today's earnings" stat on
-- /dashboard - see src/components/dashboard/DashboardStats.tsx) never fire
-- - inserts still happen correctly, the client just never hears about them
-- over the realtime websocket, so the UI only picks them up on next full
-- page load/refetch instead of updating live.
--
-- Guarded so re-running this file is always a safe no-op.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'transactions'
  ) then
    alter publication supabase_realtime add table public.transactions;
  end if;
end $$;
