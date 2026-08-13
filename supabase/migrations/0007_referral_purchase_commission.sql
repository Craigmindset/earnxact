-- EarnXact: 10% referral purchase commission
-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query).
--
-- Feature: on top of the existing flat ₦50 signup reward (still claimed
-- manually via claim_referral_balance(), unchanged by this file), a
-- referrer now ALSO earns a 10% commission every time someone they referred
-- (user_profile.referred_by_id) purchases/upgrades a membership plan via
-- Paystack. Unlike the ₦50 signup reward, this commission is credited
-- straight to the referrer's user_profile.wallet_balance immediately - no
-- separate "Claim" action - and logged as its own transactions row so it
-- shows up in the referrer's transaction history right away.
--
-- How it's stored:
--   - New ledger table public.referral_purchase_commissions: one audit row
--     per purchase-commission event (referrer_id, referee_id, the plan
--     bought, the amount paid, the 10% commission, the Paystack reference
--     it came from) - repeatable per purchase (not a one-time signup
--     event), since a referred user can upgrade plans multiple times and
--     earns the referrer a fresh 10% each time. `claimed` is always true
--     here (kept only for shape-parity with public.referrals / so a future
--     "pending vs settled" distinction is easy to add) - there is no
--     separate claim step for this money.
--   - public.user_profile.wallet_balance (the referrer's spendable balance)
--     is credited immediately, and a 'bonus' public.transactions row is
--     inserted for the referrer so it appears in their transaction history
--     (/dashboard/notifications) right away.
--   - public.claim_referral_balance() (the ₦50 signup-reward "Claim"
--     button) is completely untouched by this file - it still only ever
--     claims public.referrals rows, exactly as before.
--
-- Safe to re-run any time - guarded (CREATE TABLE IF NOT EXISTS, CREATE OR
-- REPLACE FUNCTION), no destructive reset block.

-- ─── 1. referral_purchase_commissions ledger table ─────────────────────────
create table if not exists public.referral_purchase_commissions (
  id                 uuid primary key default gen_random_uuid(),
  referrer_id        uuid not null references public.user_profile(user_id) on delete cascade,
  referee_id         uuid not null references public.user_profile(user_id) on delete cascade,
  membership_plan_id uuid references public.membership_plans(id),
  plan_name          text,
  purchase_amount    numeric(12, 2) not null,
  commission_amount  numeric(12, 2) not null,
  reference          text not null unique,
  claimed            boolean not null default true,
  created_at         timestamptz not null default now()
);

create index if not exists referral_purchase_commissions_referrer_id_idx
  on public.referral_purchase_commissions(referrer_id);

alter table public.referral_purchase_commissions enable row level security;

-- Users can only see commission rows where they are the referrer (their own
-- earnings history). No insert/update/delete policy for regular users - all
-- writes happen exclusively via the SECURITY DEFINER function below.
drop policy if exists "Users can view their own referral purchase commissions" on public.referral_purchase_commissions;
create policy "Users can view their own referral purchase commissions"
  on public.referral_purchase_commissions for select
  using (auth.uid() = referrer_id);

-- ─── 2. apply_membership_payment(): auto-credit the referrer's 10% commission ─
-- Re-declares the function from 0005_membership_payment_processing.sql,
-- adding the commission step at the end. Everything above the new block is
-- unchanged from 0005 - kept in sync here rather than editing that file, so
-- each migration file remains a complete, standalone description of the
-- function as of that point in time.
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
  v_referrer_id uuid;
  v_commission numeric(12, 2);
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

  -- 10% referral purchase commission: if this buyer was referred by someone
  -- (user_profile.referred_by_id), credit that referrer's wallet_balance
  -- directly with 10% of what was just paid (no separate claim step,
  -- unlike the ₦50 signup reward) and log both the ledger row and a
  -- transactions row for the referrer so it shows in their transaction
  -- history immediately. The unique constraint on
  -- referral_purchase_commissions.reference (same Paystack reference as the
  -- payment) guarantees this can never be double-awarded even if this
  -- function were somehow re-entered for the same payment.
  select referred_by_id into v_referrer_id from public.user_profile where user_id = v_user_id;

  if v_referrer_id is not null then
    v_commission := round(p_amount * 0.10, 2);

    insert into public.referral_purchase_commissions (
      referrer_id, referee_id, membership_plan_id, plan_name,
      purchase_amount, commission_amount, reference
    )
    values (v_referrer_id, v_user_id, p_plan_id, v_plan_name, p_amount, v_commission, p_reference)
    on conflict (reference) do nothing;

    if found then
      update public.user_profile
      set wallet_balance = wallet_balance + v_commission,
          updated_at = now()
      where user_id = v_referrer_id;

      insert into public.transactions (user_id, type, amount, status, reference, description)
      values (
        v_referrer_id,
        'bonus',
        v_commission,
        'completed',
        p_reference || ':referral_commission',
        '10% referral commission: ' || v_plan_name || ' purchased by your referral'
      );
    end if;
  end if;

  return query select v_new_balance, v_bonus, v_plan_name, v_account_type;
end;
$$;

grant execute on function public.apply_membership_payment(uuid, text, numeric) to authenticated;
