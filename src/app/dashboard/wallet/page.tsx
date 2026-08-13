"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import Lottie from "lottie-react";
import {
  MdAccountBalance,
  MdAccountBalanceWallet,
  MdBolt,
  MdCardGiftcard,
  MdCheckCircle,
  MdClose,
  MdErrorOutline,
  MdInfoOutline,
  MdLock,
  MdNotificationsActive
} from "react-icons/md";
import { FaBitcoin, FaPaypal } from "react-icons/fa6";
import { NIGERIAN_BANKS } from "@/components/dashboard/nigerian-banks";
import { CURRENCY_SYMBOL } from "@/lib/currency";
import { formatRelativeTime, getNextWithdrawalWindow } from "@/lib/time";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import cryptoAnimation from "../../../../public/images/crypto.json";

type PaymentMethodId = "bank" | "paypal" | "crypto" | "gift";

const PAYMENT_METHODS: { id: PaymentMethodId; label: string; icon: typeof MdAccountBalance }[] = [
  { id: "bank", label: "Bank Transfer", icon: MdAccountBalance },
  { id: "paypal", label: "PayPal", icon: FaPaypal },
  { id: "crypto", label: "Crypto", icon: FaBitcoin },
  { id: "gift", label: "Gift Card", icon: MdCardGiftcard }
];

type CashoutEntry = { email: string; amount: number; createdAt: number };

// Live countdown to the next Friday withdrawal window (Africa/Lagos) - see
// create_withdrawal_request() in supabase/migrations/0008_withdrawal_limits.sql.
function useWithdrawalCountdown() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { isFridayToday, targetTimestampMs } = getNextWithdrawalWindow(new Date(now));
  const remainingSeconds = Math.max(0, Math.floor((targetTimestampMs - now) / 1000));

  return {
    isFridayToday,
    targetTimestampMs,
    days: Math.floor(remainingSeconds / 86400),
    hours: Math.floor((remainingSeconds % 86400) / 3600),
    minutes: Math.floor((remainingSeconds % 3600) / 60),
    seconds: remainingSeconds % 60
  };
}

export default function WalletPage() {
  const { userId, walletBalance, loading: loadingWallet } = useUserProfile();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId | null>(null);
  const [activeModal, setActiveModal] = useState<"bank" | "crypto" | "unavailable" | null>(null);

  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState(["", "", "", ""]);
  const pinRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Backend integration point:
  // - hasPin gates the whole withdraw flow: a user must set a withdrawal PIN
  //   on /dashboard/account-settings (via set_withdrawal_pin()) before they
  //   can submit a withdrawal request at all.
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Real "Cashout Board" feed - powered by get_recent_cashouts() (supabase/
  // migrations/0009_recent_cashouts_feed.sql), a SECURITY DEFINER function
  // that returns masked, cross-user withdrawal activity from public.transactions
  // (RLS on transactions only allows a user to see their own rows, so this
  // narrow function is the deliberate exception). Re-fetched immediately
  // whenever a new withdrawal transaction is inserted anywhere, via realtime.
  const [cashoutFeed, setCashoutFeed] = useState<CashoutEntry[]>([]);
  const countdown = useWithdrawalCountdown();

  // "Notify me" - lets a user opt in to a personal reminder (posted to
  // /dashboard/notifications) for the moment the Friday withdrawal window
  // next opens. See request_withdrawal_reminder()/claim_due_withdrawal_reminders()
  // in supabase/migrations/0010_notifications_and_reminders.sql.
  const [reminderRequested, setReminderRequested] = useState(false);
  const [requestingReminder, setRequestingReminder] = useState(false);

  const targetDateLabel = new Date(countdown.targetTimestampMs).toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const supabase = createClient();

    // Fires any reminder that's due for THIS user (only actually does
    // anything if it's Friday and they have a pending request) then checks
    // whether a reminder request is still standing, to reflect it in the UI.
    supabase
      .rpc("claim_due_withdrawal_reminders")
      .then(() => supabase.from("withdrawal_notify_requests").select("id").maybeSingle())
      .then(({ data }) => {
        if (!cancelled) setReminderRequested(Boolean(data));
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function handleNotifyMeClick() {
    if (requestingReminder || reminderRequested) return;

    setRequestingReminder(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("request_withdrawal_reminder");
    setRequestingReminder(false);

    if (!error) {
      setReminderRequested(true);
    }
  }

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function loadCashoutFeed() {
      const { data } = await supabase.rpc("get_recent_cashouts", { p_limit: 12 });
      if (!cancelled && data) {
        setCashoutFeed(
          data.map((row) => ({
            email: row.masked_email,
            amount: row.amount,
            createdAt: new Date(row.created_at).getTime()
          }))
        );
      }
    }

    loadCashoutFeed();

    const channel = supabase
      .channel("cashout-board")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: "type=eq.withdrawal" },
        () => loadCashoutFeed()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const supabase = createClient();

    supabase.rpc("has_withdrawal_pin").then(({ data }) => {
      if (!cancelled) setHasPin(Boolean(data));
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  function handleWithdrawClick() {
    if (!selectedMethod) return;

    if (selectedMethod === "bank") {
      setSubmitError(null);
      setSubmitSuccess(false);
      setActiveModal("bank");
    } else if (selectedMethod === "crypto") {
      setActiveModal("crypto");
    } else {
      setActiveModal("unavailable");
    }
  }

  function closeModal() {
    setActiveModal(null);
  }

  async function handleConfirmWithdrawal() {
    if (!isBankFormValid || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    const supabase = createClient();
    // The withdrawal amount/day-of-week/min-max limits are all validated
    // server-side inside create_withdrawal_request() (supabase/migrations/
    // 0008_withdrawal_limits.sql) - any rule violation comes back as
    // error.message here and is surfaced via submitError below, rather than
    // being pre-checked/labeled in this UI.
    const { error } = await supabase.rpc("create_withdrawal_request", {
      p_amount: Number(amount),
      p_bank_name: bankName,
      p_account_name: accountName,
      p_account_number: accountNumber,
      p_pin: pin.join("")
    });

    setSubmitting(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    setAccountNumber("");
    setBankName("");
    setAccountName("");
    setAmount("");
    setPin(["", "", "", ""]);
    setSubmitSuccess(true);
    setActiveModal(null);
  }

  function handlePinChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const digit = event.target.value.replace(/\D/g, "").slice(-1);
    const nextPin = [...pin];
    nextPin[index] = digit;
    setPin(nextPin);

    if (digit && index < 3) {
      pinRefs.current[index + 1]?.focus();
    }
  }

  function handlePinKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  }

  const isBankFormValid =
    amount.trim().length > 0 &&
    Number(amount) > 0 &&
    Number(amount) <= walletBalance &&
    Number(amount) >= 10000 &&
    Number(amount) <= 200000 &&
    accountNumber.trim().length >= 10 &&
    bankName !== "" &&
    accountName.trim().length > 0 &&
    pin.every((digit) => digit !== "");

  const selectedMethodLabel = PAYMENT_METHODS.find((method) => method.id === selectedMethod)?.label ?? "";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-white/10">
        <Image
          src="/images/invite-bg.jpg"
          alt=""
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />

        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-3 py-1 text-xs font-semibold text-[var(--brand-gold)]">
            <MdBolt className="text-sm" />
            Fast & secure payouts
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]">
              <MdAccountBalanceWallet className="text-2xl" />
            </div>
            <h1 className="text-2xl font-semibold uppercase tracking-wide text-white md:text-3xl">
              Withdraw Cash
            </h1>
          </div>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70 md:text-base">
            Cash out your earnings straight to your bank, wallet or preferred
            payout method — fast, secure and hassle-free.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-white/50">
              Wallet Account
            </div>

            <div className="mt-1 text-2xl font-semibold text-[var(--brand-gold)]">
              {CURRENCY_SYMBOL}
              {loadingWallet ? "0.00" : walletBalance.toFixed(2)}
            </div>

            <p className="mt-2 text-xs text-white/50">
              {countdown.isFridayToday ? (
                <>
                  Withdrawals are open today - window closes in{" "}
                  {countdown.days > 0 ? `${countdown.days}d ` : ""}
                  {countdown.hours}h {countdown.minutes}m {countdown.seconds}s{" "}
                  (by {targetDateLabel}).
                </>
              ) : (
                <>
                  Next withdrawal window opens in{" "}
                  {countdown.days > 0 ? `${countdown.days}d ` : ""}
                  {countdown.hours}h {countdown.minutes}m {countdown.seconds}s{" "}
                  ({targetDateLabel}).
                </>
              )}
            </p>

            {!countdown.isFridayToday && (
              <button
                type="button"
                onClick={handleNotifyMeClick}
                disabled={requestingReminder || reminderRequested}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--brand-gold)] transition hover:bg-[var(--brand-gold)]/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <MdNotificationsActive className="text-sm" />
                {reminderRequested ? "We'll notify you" : "Notify me"}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleWithdrawClick}
              disabled={!selectedMethod || !hasPin || walletBalance <= 0}
              className="rounded-lg bg-[var(--brand-smoky-white)] px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
            >
              Withdraw
            </button>
          </div>
        </div>

        {hasPin === false && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-400">
            <MdLock className="shrink-0 text-sm" />
            You need to set a withdrawal PIN before you can cash out.{" "}
            <Link href="/dashboard/account-settings" className="font-semibold underline">
              Set it now
            </Link>
          </div>
        )}

        {submitSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-400">
            <MdCheckCircle className="shrink-0 text-sm" />
            Your withdrawal request has been submitted and is now processing.
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-white md:text-base">
          Choose payout method
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {PAYMENT_METHODS.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedMethod === method.id;

            return (
              <button
                key={method.id}
                type="button"
                onClick={() => setSelectedMethod(method.id)}
                className={`flex flex-col items-center gap-3 rounded-2xl border bg-white/5 p-5 transition hover:-translate-y-0.5 hover:bg-white/10 ${
                  isSelected ? "border-[var(--brand-gold)] ring-1 ring-[var(--brand-gold)]" : "border-white/10"
                }`}
              >
                <Icon
                  className={`text-4xl ${isSelected ? "text-[var(--brand-gold)]" : "text-white/70"}`}
                />
                <span className="text-xs font-semibold text-white/80 sm:text-sm">
                  {method.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-sm font-semibold text-white md:text-base">
          Cashout Board
        </h2>

        <div className="relative mt-4 h-52 overflow-hidden">
          {cashoutFeed.length > 0 ? (
            <ul className="animate-scroll-up absolute inset-x-0 top-0 space-y-3">
              {[...cashoutFeed, ...cashoutFeed].map((entry, index) => (
                <li
                  key={`${entry.email}-${entry.createdAt}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-xs sm:text-sm"
                >
                  <div className="flex flex-col">
                    <span className="text-white/70">{entry.email}</span>
                    <span className="text-[10px] text-white/40">
                      {formatRelativeTime(entry.createdAt)}
                    </span>
                  </div>
                  <span className="font-semibold text-[var(--brand-gold)]">
                    cash out: {CURRENCY_SYMBOL}
                    {entry.amount.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-white/40">
              No recent cashouts yet.
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-sm leading-relaxed text-white/70">
        <MdInfoOutline className="shrink-0 text-base text-[var(--brand-gold)]" />
        Withdrawals usually process within 24 to 48 hours on a stable network.
      </div>

      {activeModal === "bank" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--brand-card-1)] p-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Bank Transfer</h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <MdClose className="text-lg" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-white/60">
                  Amount to Withdraw
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value.replace(/[^0-9.]/g, ""))
                  }
                  placeholder={`Available: ${CURRENCY_SYMBOL}${walletBalance.toFixed(2)}`}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--brand-gold)]"
                />
                {amount.trim().length > 0 && Number(amount) > 0 && Number(amount) < 10000 && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-400">
                    <MdErrorOutline className="shrink-0 text-sm" />
                    The minimum withdrawal amount is {CURRENCY_SYMBOL}10,000.
                  </p>
                )}
                {Number(amount) > 200000 && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-400">
                    <MdErrorOutline className="shrink-0 text-sm" />
                    The maximum withdrawal amount is {CURRENCY_SYMBOL}200,000.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-white/60">
                  Bank Account Number
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={accountNumber}
                  onChange={(event) =>
                    setAccountNumber(event.target.value.replace(/\D/g, ""))
                  }
                  placeholder="0123456789"
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--brand-gold)]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-white/60">
                  Select Bank Name
                </label>
                <select
                  value={bankName}
                  onChange={(event) => setBankName(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--brand-gold)]"
                >
                  <option value="" className="bg-[var(--brand-card-1)]">
                    Choose your bank
                  </option>
                  {NIGERIAN_BANKS.map((bank) => (
                    <option key={bank} value={bank} className="bg-[var(--brand-card-1)]">
                      {bank}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-white/60">
                  Account Name
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(event) => setAccountName(event.target.value)}
                  placeholder="Account holder's name"
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--brand-gold)]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-white/60">
                  Enter 4-digit PIN
                </label>
                <div className="mt-1.5 flex gap-2">
                  {pin.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        pinRefs.current[index] = element;
                      }}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(event) => handlePinChange(index, event)}
                      onKeyDown={(event) => handlePinKeyDown(index, event)}
                      className="h-12 w-12 rounded-lg border border-white/10 bg-black/20 text-center text-lg font-semibold text-white outline-none focus:border-[var(--brand-gold)]"
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-relaxed text-white/60">
                <MdInfoOutline className="mt-0.5 shrink-0 text-sm text-[var(--brand-gold)]" />
                Please verify and confirm your account number before clicking
                Payout or Confirmation.
              </div>

              {submitError && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-400">
                  <MdErrorOutline className="shrink-0 text-sm" />
                  {submitError}
                </div>
              )}

              <button
                type="button"
                disabled={!isBankFormValid || submitting}
                onClick={handleConfirmWithdrawal}
                className="w-full rounded-lg bg-[var(--brand-smoky-white)] px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
              >
                {submitting ? "Submitting..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === "crypto" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[var(--brand-card-1)] p-6 text-center"
          >
            <div className="flex justify-end">
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <MdClose className="text-lg" />
              </button>
            </div>
            <Lottie animationData={cryptoAnimation} loop className="mx-auto h-32 w-32" />
            <h3 className="mt-2 text-base font-semibold text-white">
              Crypto Payout
            </h3>
            <p className="mt-1 text-sm text-white/60">Coming soon</p>
          </div>
        </div>
      )}

      {activeModal === "unavailable" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[var(--brand-card-1)] p-6 text-center"
          >
            <div className="flex justify-end">
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <MdClose className="text-lg" />
              </button>
            </div>
            <h3 className="text-base font-semibold text-white">
              {selectedMethodLabel}
            </h3>
            <p className="mt-2 text-sm text-white/60">
              Not available in your country
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
