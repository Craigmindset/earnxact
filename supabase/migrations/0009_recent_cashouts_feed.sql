-- EarnXact: real "Cashout Board" feed backed by public.transactions
-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query).
--
-- src/app/dashboard/wallet/page.tsx's "Cashout Board" used to render a
-- hardcoded, fake array of recent payouts. This adds a SECURITY DEFINER
-- function that returns real, masked withdrawal activity across ALL users
-- (never raw email/user_id - `transactions` RLS only allows a user to see
-- their OWN rows, so a normal client-side select can't power a cross-user
-- feed; this function is the one deliberate, narrow exception, and it only
-- ever exposes a masked email + amount + timestamp, nothing else).
create or replace function public.get_recent_cashouts(p_limit integer default 12)
returns table(masked_email text, amount numeric, created_at timestamptz)
language sql
security definer set search_path = public, extensions
as $$
  select
    case
      when u.email is null or position('@' in u.email) < 2 then 'user***@earnxact.com'
      else left(split_part(u.email, '@', 1), 3) || '***@' || split_part(u.email, '@', 2)
    end as masked_email,
    t.amount,
    t.created_at
  from public.transactions t
  join auth.users u on u.id = t.user_id
  where t.type = 'withdrawal'
  order by t.created_at desc
  limit greatest(1, least(coalesce(p_limit, 12), 50));
$$;

grant execute on function public.get_recent_cashouts(integer) to authenticated;
