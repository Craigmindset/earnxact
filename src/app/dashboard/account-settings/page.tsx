"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  MdAccountBalance,
  MdArrowBack,
  MdAutorenew,
  MdCheckCircle,
  MdChevronRight,
  MdErrorOutline,
  MdHealthAndSafety,
  MdLock,
  MdPerson,
  MdPhotoCamera,
  MdPrivacyTip,
  MdShield,
  MdSupportAgent,
  MdTrendingUp
} from "react-icons/md";
import { getCurrentTaskClass } from "@/components/dashboard/task-class-data";
import { NIGERIAN_BANKS } from "@/components/dashboard/nigerian-banks";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";

// Backend integration point:
// - Replace with the authenticated user's real profile completion score.
const PROFILE_COMPLETION = 65;

const POLICY_LINKS = [
  { label: "Privacy Policy", icon: MdPrivacyTip, href: "/dashboard/privacy-policy" },
  { label: "Data Protection", icon: MdShield, href: "/dashboard/data-protection" },
  { label: "Insurance", icon: MdHealthAndSafety, href: "/dashboard/insurance" }
];

export default function AccountSettingsPage() {
  const router = useRouter();
  const activeTaskClass = getCurrentTaskClass();
  const { userId, firstName, avatarUrl, uploadAvatar } = useUserProfile();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Backend integration point:
  // - null = still loading, true/false once has_withdrawal_pin() resolves.
  //   Drives whether the form below is "Set Pin" (first time) or
  //   "Reset Pin" (requires the current PIN to change it).
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [pinSubmitting, setPinSubmitting] = useState(false);

  const [currentPin, setCurrentPin] = useState(["", "", "", ""]);
  const currentPinRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [pin, setPin] = useState(["", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", ""]);
  const pinRefs = useRef<Array<HTMLInputElement | null>>([]);
  const confirmPinRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [pinMessage, setPinMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [withdrawalMessage, setWithdrawalMessage] = useState<string | null>(null);

  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketSuccess, setTicketSuccess] = useState(false);

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

  function handleCurrentPinChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const digit = event.target.value.replace(/\D/g, "").slice(-1);
    const nextCurrentPin = [...currentPin];
    nextCurrentPin[index] = digit;
    setCurrentPin(nextCurrentPin);
    setPinMessage(null);

    if (digit && index < 3) {
      currentPinRefs.current[index + 1]?.focus();
    }
  }

  function handleCurrentPinKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !currentPin[index] && index > 0) {
      currentPinRefs.current[index - 1]?.focus();
    }
  }

  function handlePinChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const digit = event.target.value.replace(/\D/g, "").slice(-1);
    const nextPin = [...pin];
    nextPin[index] = digit;
    setPin(nextPin);
    setPinMessage(null);

    if (digit && index < 3) {
      pinRefs.current[index + 1]?.focus();
    }
  }

  function handlePinKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  }

  function handleConfirmPinChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const digit = event.target.value.replace(/\D/g, "").slice(-1);
    const nextConfirmPin = [...confirmPin];
    nextConfirmPin[index] = digit;
    setConfirmPin(nextConfirmPin);
    setPinMessage(null);

    if (digit && index < 3) {
      confirmPinRefs.current[index + 1]?.focus();
    }
  }

  function handleConfirmPinKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !confirmPin[index] && index > 0) {
      confirmPinRefs.current[index - 1]?.focus();
    }
  }

  // True as soon as every Confirm PIN box is filled but doesn't match New PIN -
  // drives the red "don't match" border + inline message below.
  const pinsMismatch = confirmPin.every(Boolean) && pin.join("") !== confirmPin.join("");

  async function handleSetPin() {
    if (hasPin && !currentPin.every(Boolean)) {
      setPinMessage({ type: "error", text: "Please enter your current PIN." });
      return;
    }

    if (!pin.every(Boolean) || !confirmPin.every(Boolean)) {
      setPinMessage({ type: "error", text: "Please fill in both 4-digit PINs." });
      return;
    }

    if (pin.join("") !== confirmPin.join("")) {
      setPinMessage({ type: "error", text: "PINs do not match. Please try again." });
      return;
    }

    setPinSubmitting(true);
    setPinMessage(null);

    try {
      const supabase = createClient();
      const { error } = hasPin
        ? await supabase.rpc("reset_withdrawal_pin", {
            p_current_pin: currentPin.join(""),
            p_new_pin: pin.join("")
          })
        : await supabase.rpc("set_withdrawal_pin", { p_pin: pin.join("") });

      if (error) {
        setPinMessage({ type: "error", text: `PIN update failed: ${error.message}` });
        return;
      }

      setCurrentPin(["", "", "", ""]);
      setPin(["", "", "", ""]);
      setConfirmPin(["", "", "", ""]);
      setHasPin(true);
      setPinMessage({ type: "success", text: hasPin ? "PIN updated successfully." : "PIN set successfully." });
    } catch {
      setPinMessage({ type: "error", text: "PIN update failed. Please try again." });
    } finally {
      setPinSubmitting(false);
    }
  }

  const isWithdrawalFormValid =
    accountName.trim().length > 0 && bankName !== "" && bankAccountNumber.length === 10;

  function handleSetWithdrawal(event: FormEvent) {
    event.preventDefault();
    if (!isWithdrawalFormValid) return;
    setWithdrawalMessage("Your withdrawal account has been added successfully");
  }

  function handleSubmitTicket(event: FormEvent) {
    event.preventDefault();
    if (ticketMessage.trim().length === 0) return;
    setTicketSuccess(true);
    setTicketMessage("");
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    setAvatarError(null);

    try {
      await uploadAvatar(file);
    } catch (err) {
      console.error("[AccountSettings] Failed to upload profile photo", err);
      setAvatarError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
        >
          <MdArrowBack className="text-lg" />
        </button>

        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">
            Account Settings
          </h1>
          <p className="mt-1 text-sm text-white/50">
            Manage your profile, security, withdrawal account and support
            preferences.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-[var(--brand-gold)]/20 text-[var(--brand-gold)]">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Profile"
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              ) : (
                <MdPerson className="text-3xl" />
              )}

              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                aria-label="Change profile photo"
                title="Change profile photo"
                className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition hover:opacity-100 disabled:opacity-100"
              >
                <MdPhotoCamera className="text-lg" />
              </button>

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-white/50">
                Current Plan
              </div>
              <div className="mt-0.5 text-sm font-semibold text-white sm:text-base">
                {activeTaskClass ? activeTaskClass.name : "No active category"}
              </div>
              {firstName && (
                <div className="mt-0.5 text-xs text-white/50">{firstName}</div>
              )}
              {avatarUploading && (
                <div className="mt-0.5 text-xs text-white/50">Uploading photo...</div>
              )}
              {avatarError && (
                <div className="mt-0.5 text-xs text-red-400">{avatarError}</div>
              )}
            </div>

            <button
              type="button"
              onClick={() => router.push("/dashboard/earnpass")}
              aria-label="Upgrade plan"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-smoky-white)] text-black transition hover:opacity-90"
            >
              <MdTrendingUp className="text-lg" />
            </button>
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-white/50">
              <span>Profile Completion</span>
              <span>{PROFILE_COMPLETION}%</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[var(--brand-gold)]"
                style={{ width: `${PROFILE_COMPLETION}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
        <div className="flex items-center gap-2">
          <MdLock className="text-lg text-[var(--brand-gold)]" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white md:text-base">
            {hasPin ? "Reset Pin" : "Set Pin"}
          </h2>
        </div>
        <p className="mt-1 text-xs text-white/50">
          {hasPin
            ? "Enter your current PIN and choose a new 4-digit PIN."
            : "Create a 4-digit PIN to secure your withdrawals."}
        </p>

        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:gap-10">
          {hasPin && (
            <div>
              <label className="text-xs font-medium text-white/60">Current PIN</label>
              <div className="mt-1.5 flex gap-2">
                {currentPin.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      currentPinRefs.current[index] = element;
                    }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    required
                    value={digit}
                    onChange={(event) => handleCurrentPinChange(index, event)}
                    onKeyDown={(event) => handleCurrentPinKeyDown(index, event)}
                    className="h-12 w-12 rounded-lg border border-white/10 bg-black/20 text-center text-lg font-semibold text-white outline-none focus:border-[var(--brand-gold)]"
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-white/60">New PIN</label>
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
                  required
                  value={digit}
                  onChange={(event) => handlePinChange(index, event)}
                  onKeyDown={(event) => handlePinKeyDown(index, event)}
                  className="h-12 w-12 rounded-lg border border-white/10 bg-black/20 text-center text-lg font-semibold text-white outline-none focus:border-[var(--brand-gold)]"
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-white/60">Confirm PIN</label>
            <div className="mt-1.5 flex gap-2">
              {confirmPin.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    confirmPinRefs.current[index] = element;
                  }}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  required
                  value={digit}
                  onChange={(event) => handleConfirmPinChange(index, event)}
                  onKeyDown={(event) => handleConfirmPinKeyDown(index, event)}
                  className={`h-12 w-12 rounded-lg border bg-black/20 text-center text-lg font-semibold text-white outline-none transition-colors ${
                    pinsMismatch
                      ? "border-red-500 focus:border-red-500"
                      : "border-white/10 focus:border-[var(--brand-gold)]"
                  }`}
                />
              ))}
            </div>
            {pinsMismatch && <p className="mt-1.5 text-xs text-red-400">PINs do not match.</p>}
          </div>
        </div>

        {pinMessage && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs ${
              pinMessage.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            }`}
          >
            {pinMessage.type === "success" ? (
              <MdCheckCircle className="shrink-0 text-sm" />
            ) : (
              <MdErrorOutline className="shrink-0 text-sm" />
            )}
            {pinMessage.text}
          </div>
        )}

        <button
          type="button"
          onClick={handleSetPin}
          disabled={hasPin === null || pinSubmitting}
          className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--brand-smoky-white)] px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pinSubmitting && <MdAutorenew className="animate-spin text-base" />}
          {pinSubmitting ? "Submitting..." : "Submit"}
        </button>
      </div>

      <form
        onSubmit={handleSetWithdrawal}
        className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6"
      >
        <div className="flex items-center gap-2">
          <MdAccountBalance className="text-lg text-[var(--brand-gold)]" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white md:text-base">
            Set Withdrawal
          </h2>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-white/60">
              Account Name
            </label>
            <input
              type="text"
              required
              value={accountName}
              onChange={(event) => {
                setAccountName(event.target.value);
                setWithdrawalMessage(null);
              }}
              placeholder="Account holder's name"
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--brand-gold)]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-white/60">Bank</label>
            <select
              required
              value={bankName}
              onChange={(event) => {
                setBankName(event.target.value);
                setWithdrawalMessage(null);
              }}
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
              Bank Account Number
            </label>
            <input
              type="text"
              inputMode="numeric"
              minLength={10}
              maxLength={10}
              pattern="\d{10}"
              title="Enter a 10-digit account number"
              required
              value={bankAccountNumber}
              onChange={(event) => {
                setBankAccountNumber(event.target.value.replace(/\D/g, "").slice(0, 10));
                setWithdrawalMessage(null);
              }}
              placeholder="0123456789"
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--brand-gold)]"
            />
          </div>
        </div>

        {withdrawalMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-400">
            <MdCheckCircle className="shrink-0 text-sm" />
            {withdrawalMessage}
          </div>
        )}

        <button
          type="submit"
          className="mt-4 rounded-lg bg-[var(--brand-smoky-white)] px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
        >
          Submit
        </button>
      </form>

      <form
        onSubmit={handleSubmitTicket}
        className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6"
      >
        <div className="flex items-center gap-2">
          <MdSupportAgent className="text-lg text-[var(--brand-gold)]" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white md:text-base">
            Support
          </h2>
        </div>
        <p className="mt-1 text-xs text-white/50">Create a Ticket</p>

        <textarea
          value={ticketMessage}
          onChange={(event) => {
            setTicketMessage(event.target.value.slice(0, 500));
            setTicketSuccess(false);
          }}
          maxLength={500}
          required
          rows={4}
          placeholder="Describe the issue you're experiencing..."
          className="mt-4 w-full resize-none rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--brand-gold)]"
        />
        <div className="mt-1 text-right text-[10px] text-white/40">
          {ticketMessage.length}/500
        </div>

        {ticketSuccess && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-400">
            <MdCheckCircle className="shrink-0 text-sm" />
            Your ticket has been submitted. Our support team will get back to
            you shortly.
          </div>
        )}

        <button
          type="submit"
          className="mt-4 rounded-lg bg-[var(--brand-smoky-white)] px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
        >
          Submit
        </button>
      </form>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white md:text-base">
          Legal & Protection
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {POLICY_LINKS.map(({ label, icon: Icon, href }) => (
            <button
              key={label}
              type="button"
              onClick={() => router.push(href)}
              className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3 text-left transition hover:bg-white/5"
            >
              <Icon className="text-lg text-[var(--brand-smoky-white)]" />
              <span className="flex-1 text-sm font-medium text-white/80">{label}</span>
              <MdChevronRight className="text-lg text-white/40" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
