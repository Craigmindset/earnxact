"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import Image from "next/image";
import Lottie from "lottie-react";
import {
  MdAccountBalance,
  MdAccountBalanceWallet,
  MdBolt,
  MdCardGiftcard,
  MdClose,
  MdInfoOutline
} from "react-icons/md";
import { FaBitcoin, FaPaypal } from "react-icons/fa6";
import { NIGERIAN_BANKS } from "@/components/dashboard/nigerian-banks";
import { CURRENCY_SYMBOL } from "@/lib/currency";
import { formatRelativeTime } from "@/lib/time";
import cryptoAnimation from "../../../../public/images/crypto.json";

type PaymentMethodId = "bank" | "paypal" | "crypto" | "gift";

const PAYMENT_METHODS: { id: PaymentMethodId; label: string; icon: typeof MdAccountBalance }[] = [
  { id: "bank", label: "Bank Transfer", icon: MdAccountBalance },
  { id: "paypal", label: "PayPal", icon: FaPaypal },
  { id: "crypto", label: "Crypto", icon: FaBitcoin },
  { id: "gift", label: "Gift Card", icon: MdCardGiftcard }
];

// Backend integration point:
// - Replace with the authenticated user's real wallet balance.
const WALLET_BALANCE = 0;

// Backend integration point:
// - Replace with a real live feed of recent payouts (API/websocket),
//   masked for privacy as done here.
const CASHOUT_FEED = [
  { email: "mat***@gmail.com", amount: 200000, minutesAgo: 2 },
  { email: "jan***@yahoo.com", amount: 150000, minutesAgo: 26 },
  { email: "dav***@outlook.com", amount: 320000, minutesAgo: 190 },
  { email: "chi***@gmail.com", amount: 95000, minutesAgo: 540 },
  { email: "ken***@gmail.com", amount: 410000, minutesAgo: 1500 },
  { email: "ama***@yahoo.com", amount: 60000, minutesAgo: 4000 }
];

export default function WalletPage() {
  const [isPartial, setIsPartial] = useState(false);
  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId | null>(null);
  const [activeModal, setActiveModal] = useState<"bank" | "crypto" | "unavailable" | null>(null);

  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [pin, setPin] = useState(["", "", "", ""]);
  const pinRefs = useRef<Array<HTMLInputElement | null>>([]);

  function handleWithdrawClick() {
    if (!selectedMethod) return;

    if (selectedMethod === "bank") {
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

            {isPartial ? (
              <div className="mt-1 flex items-center gap-1 text-2xl font-semibold text-[var(--brand-gold)]">
                {CURRENCY_SYMBOL}
                <input
                  type="number"
                  min={0}
                  max={WALLET_BALANCE}
                  autoFocus
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  className="w-32 border-b border-[var(--brand-gold)]/50 bg-transparent text-2xl font-semibold text-[var(--brand-gold)] outline-none placeholder:text-[var(--brand-gold)]/40"
                />
              </div>
            ) : (
              <div className="mt-1 text-2xl font-semibold text-[var(--brand-gold)]">
                {CURRENCY_SYMBOL}
                {WALLET_BALANCE.toFixed(2)}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPartial((value) => !value)}
              className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
                isPartial
                  ? "border-[var(--brand-gold)] text-[var(--brand-gold)]"
                  : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
              }`}
            >
              Partial Withdrawal
            </button>

            <button
              type="button"
              onClick={handleWithdrawClick}
              disabled={!selectedMethod}
              className="rounded-lg bg-[var(--brand-gold)] px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
            >
              Withdraw
            </button>
          </div>
        </div>
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
          <ul className="animate-scroll-up absolute inset-x-0 top-0 space-y-3">
            {[...CASHOUT_FEED, ...CASHOUT_FEED].map((entry, index) => (
              <li
                key={`${entry.email}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-xs sm:text-sm"
              >
                <div className="flex flex-col">
                  <span className="text-white/70">{entry.email}</span>
                  <span className="text-[10px] text-white/40">
                    {formatRelativeTime(Date.now() - entry.minutesAgo * 60 * 1000)}
                  </span>
                </div>
                <span className="font-semibold text-[var(--brand-gold)]">
                  cash out: {CURRENCY_SYMBOL}
                  {entry.amount.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
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

              <button
                type="button"
                disabled={!isBankFormValid}
                onClick={closeModal}
                className="w-full rounded-lg bg-[var(--brand-gold)] px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
              >
                Confirm
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
