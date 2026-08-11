-- EarnXact: apply a verified Paystack EarnPass payment
-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query).
--
-- Safe to re-run any time, on any database state - guarded (CREATE OR
-- REPLACE), no destructive reset block. Only ever adds/updates:
--   - 1 SECURITY DEFINER function: apply_membership_payment() - the only
--     way a verified Paystack payment ever updates user_profile.membership_plan_id/
--     account_type/wallet_balance or writes to transactions for a purchase.
--     Called from src/app/api/payments/verify/route.ts right after Paystack
--     itself confirms the transaction succeeded.

-- ─── 1. apply_membership_payment() ────────────────────────────────────────────
-- Idempotent on p_reference: if this exact Paystack reference was already
-- applied for this user (e.g. the verify callback runs twice), it's a
-- no-op that just returns the current state instead of reprocessing the
-- payment or double-crediting the bonus.
--
-- account_type mapping below is a first-pass default (Free/Task class1/
-- Task Class2 -> standard, Upscale Class/Supervisor Class/Junior Manager ->
-- premium, everything above -> vip) - adjust the CASE if you want a
-- different tiering; it's the only place this mapping lives.
create or replace function public.apply_membership_payment(
  p_plan_id uuid,
  p_reference text,
  p_amount numeric
)
returns table(
  new_wallet_balance numeric,
  bonus_awarded numeric,
  plan_name text,
  account_type public.account_type
)
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_name text;
  v_plan_name_lower text;
  v_bonus numeric(12, 2) := 0;
  v_new_balance numeric(12, 2);
  v_account_type public.account_type;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_reference is null or length(trim(p_reference)) = 0 then
    raise exception 'Missing payment reference';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Invalid payment amount';
  end if;

  -- Already processed this exact payment - return current state as-is.
  if exists (
    select 1 from public.transactions where user_id = v_user_id and reference = p_reference
  ) then
    select wallet_balance, account_type into v_new_balance, v_account_type
    from public.user_profile
    where user_id = v_user_id;

    select name into v_plan_name from public.membership_plans where id = p_plan_id;

    return query select v_new_balance, 0::numeric, v_plan_name, v_account_type;
    return;
  end if;

  select name into v_plan_name from public.membership_plans where id = p_plan_id;

  if v_plan_name is null then
    raise exception 'Membership plan not found';
  end if;

  v_plan_name_lower := lower(trim(v_plan_name));

  -- Free / Task class1 (the two lowest tiers) don't carry an upgrade bonus.
  if v_plan_name_lower not in ('free', 'task class1') then
    v_bonus := round(p_amount * 0.05, 2);
  end if;

  v_account_type := case
    when v_plan_name_lower in ('free', 'task class1', 'task class2') then 'standard'
    when v_plan_name_lower in ('upscale class', 'supervisor class', 'junior manager') then 'premium'
    else 'vip'
  end;

  update public.user_profile
  set membership_plan_id = p_plan_id,
      account_type = v_account_type,
      wallet_balance = wallet_balance + v_bonus,
      updated_at = now()
  where user_id = v_user_id
  returning wallet_balance into v_new_balance;

  -- Audit row for the payment itself (doesn't touch wallet_balance - the
  -- money moved via Paystack directly, not the wallet).
  insert into public.transactions (user_id, type, amount, status, reference, description)
  values (v_user_id, 'debit', p_amount, 'completed', p_reference, 'EarnPass upgrade: ' || v_plan_name);

  if v_bonus > 0 then
    insert into public.transactions (user_id, type, amount, status, reference, description)
    values (
      v_user_id,
      'bonus',
      v_bonus,
      'completed',
      p_reference || ':bonus',
      '5% EarnPass upgrade bonus: ' || v_plan_name
    );
  end if;

  return query select v_new_balance, v_bonus, v_plan_name, v_account_type;
end;
$$;

grant execute on function public.apply_membership_payment(uuid, text, numeric) to authenticated;
