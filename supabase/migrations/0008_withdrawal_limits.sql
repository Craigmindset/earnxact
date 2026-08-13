-- EarnXact: withdrawal amount limits (N10,000 - N200,000) + Friday-only
-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query).
--
-- Two new server-side rules enforced inside create_withdrawal_request()
-- (the ONLY function that can ever create a withdrawal_requests row / debit
-- the wallet for a withdrawal - see 0004_withdrawal_pin_and_requests.sql):
--   1. Amount must be between N10,000 and N200,000 (inclusive) per request.
--   2. Withdrawals can only be initiated on a Friday (Africa/Lagos calendar
--      day, matching the timezone convention used by check-in/tasks
--      elsewhere in this app).
-- Both are intentionally NOT surfaced anywhere in the UI as static labels -
-- src/app/dashboard/wallet/page.tsx only ever displays these as an error
-- message (via the existing submitError banner) after a user actually
-- attempts a withdrawal that violates one of them, since the raised
-- exception's message flows straight back as `error.message` from the
-- supabase.rpc() call.
--
-- Safe to re-run any time - re-declares the whole function (CREATE OR
-- REPLACE), no destructive reset block.

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
  v_today_dow int;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Withdrawals can only be initiated on a Friday (Africa/Lagos calendar
  -- day) - dow: Sunday = 0 ... Friday = 5 ... Saturday = 6.
  v_today_dow := extract(dow from (now() at time zone 'Africa/Lagos'));
  if v_today_dow <> 5 then
    raise exception 'Withdrawals can only be initiated on Fridays. Please try again this Friday.';
  end if;

  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN must be exactly 4 digits.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter a valid withdrawal amount.';
  end if;

  if p_amount < 10000 then
    raise exception 'Minimum withdrawal amount is ₦10,000.';
  end if;

  if p_amount > 200000 then
    raise exception 'Maximum withdrawal amount is ₦200,000.';
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
