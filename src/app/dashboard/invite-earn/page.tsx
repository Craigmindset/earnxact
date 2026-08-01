"use client";

import { useState } from "react";
import Image from "next/image";
import {
  MdCheck,
  MdContentCopy,
  MdEmail,
  MdGroupAdd,
  MdHistory,
  MdInfoOutline,
  MdLock,
  MdPaid,
  MdPeopleAlt,
  MdVerified
} from "react-icons/md";
import { FaFacebook, FaTelegram, FaWhatsapp, FaXTwitter } from "react-icons/fa6";
import { getCurrentTaskClass } from "@/components/dashboard/task-class-data";
import { REFERRAL_TIERS } from "@/components/dashboard/referral-data";
import { CURRENCY_SYMBOL } from "@/lib/currency";

// Backend integration point:
// - Replace all mock values below (username, referral link, balances,
//   counts, dates) with data fetched from the authenticated user's
//   referral/account API.
const USERNAME = "you";
const REFERRAL_LINK = `https://earnxact.com/r/${USERNAME}`;
const REFERRAL_BALANCE = 0;
const TOTAL_EARNING = 0;
const USERS_REFERRED = 0;
const LAST_CLAIM = "--";
const MINIMUM_CLAIM = 500;

const SHARE_TARGETS = [
  {
    label: "Email",
    icon: MdEmail,
    href: `mailto:?subject=${encodeURIComponent("Join me on EarnXact")}&body=${encodeURIComponent(
      `Use my referral link to join EarnXact and start earning: ${REFERRAL_LINK}`
    )}`
  },
  {
    label: "WhatsApp",
    icon: FaWhatsapp,
    href: `https://wa.me/?text=${encodeURIComponent(
      `Join me on EarnXact and start earning: ${REFERRAL_LINK}`
    )}`
  },
  {
    label: "Facebook",
    icon: FaFacebook,
    href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(REFERRAL_LINK)}`
  },
  {
    label: "Telegram",
    icon: FaTelegram,
    href: `https://t.me/share/url?url=${encodeURIComponent(
      REFERRAL_LINK
    )}&text=${encodeURIComponent("Join me on EarnXact and start earning.")}`
  },
  {
    label: "X",
    icon: FaXTwitter,
    href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(
      REFERRAL_LINK
    )}&text=${encodeURIComponent("Join me on EarnXact and start earning.")}`
  }
];

export default function InviteEarnPage() {
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeTaskClass = getCurrentTaskClass();
  const activeTier = REFERRAL_TIERS.find(
    (tier) => tier.taskClassId === activeTaskClass?.id
  );
  const commissionRate = activeTier?.commissionRate ?? 0;
  const canClaim = REFERRAL_BALANCE >= MINIMUM_CLAIM;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(REFERRAL_LINK);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) - fail silently.
    }
  }

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
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-3 py-1 text-xs font-semibold text-[var(--brand-gold)]">
              <MdGroupAdd className="text-sm" />
              Invite friends, earn together
            </div>

            <button
              type="button"
              onClick={() => setShowHowItWorks((value) => !value)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80 transition hover:bg-white/10"
            >
              <MdInfoOutline className="text-sm" />
              How it works
            </button>
          </div>

          <h1 className="mt-4 max-w-xl text-3xl font-semibold leading-tight text-white md:text-4xl">
            Invite & Earn
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70 md:text-base">
            Share your referral link with friends and earn commission every
            time they cash out successfully.
          </p>

          {showHowItWorks && (
            <ol className="mt-5 max-w-xl space-y-2 rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-white/70">
              <li>1. Share your referral link with friends.</li>
              <li>2. Your friend signs up and completes a task.</li>
              <li>3. You earn commission automatically when they cash out.</li>
            </ol>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[var(--brand-gold)]/20 text-sm font-semibold text-[var(--brand-gold)]">
                {USERNAME.slice(0, 1).toUpperCase()}
              </span>
              <span className="text-sm font-semibold text-white">
                @{USERNAME}
              </span>
            </div>
            <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[var(--brand-gold)]">
              {commissionRate}% commission
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <span className="text-xs font-medium uppercase tracking-wide text-white/50">
              Active category
            </span>
            <span className="text-sm font-semibold text-white">
              {activeTaskClass?.name ?? "No active category"}
            </span>
          </div>

          <div className="my-5 border-t border-white/10" />

          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <MdPaid className="text-lg text-[var(--brand-gold)]" />
            My Referral Earning
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-2xl font-semibold text-[var(--brand-gold)]">
              {CURRENCY_SYMBOL}
              {REFERRAL_BALANCE.toFixed(2)}
            </span>
            <button
              type="button"
              disabled={!canClaim}
              className="rounded-lg bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
            >
              Claim
            </button>
          </div>

          <div className="my-5 border-t border-white/10" />

          <p className="text-xs leading-relaxed text-white/60">
            Use your referral link to invite & earn, your rewards will be
            shown here to claim then to your main balance. Minimum claim{" "}
            {CURRENCY_SYMBOL}
            {MINIMUM_CLAIM}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <MdPeopleAlt className="text-lg text-[var(--brand-gold)]" />
            Referral Count
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <MdPaid className="text-lg text-[var(--brand-gold)]" />
              <div className="mt-2 text-lg font-semibold text-white">
                {CURRENCY_SYMBOL}
                {TOTAL_EARNING.toFixed(2)}
              </div>
              <div className="mt-1 text-xs text-white/50">Total Earning</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <MdPeopleAlt className="text-lg text-[var(--brand-gold)]" />
              <div className="mt-2 text-lg font-semibold text-white">
                {USERS_REFERRED}
              </div>
              <div className="mt-1 text-xs text-white/50">Users Referred</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <MdHistory className="text-lg text-[var(--brand-gold)]" />
              <div className="mt-2 text-lg font-semibold text-white">
                {LAST_CLAIM}
              </div>
              <div className="mt-1 text-xs text-white/50">Last Claim</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="lg:max-w-sm">
            <div className="text-sm font-semibold text-white">
              Your Referral Link
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="flex-1 truncate rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-xs text-white/70 sm:text-sm">
                {REFERRAL_LINK}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy referral link"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-gold)] text-black transition hover:opacity-90"
              >
                {copied ? <MdCheck className="text-lg" /> : <MdContentCopy className="text-lg" />}
              </button>
            </div>
          </div>

          <div className="lg:max-w-sm lg:text-right">
            <div className="text-sm font-semibold text-white">
              Share your Referral Link
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 lg:justify-end">
              {SHARE_TARGETS.map((target) => (
                <a
                  key={target.label}
                  href={target.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Share via ${target.label}`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  <target.icon className="text-lg" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-white md:text-base">
          Reach the next tier to earn a higher commission from your referral.
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REFERRAL_TIERS.map((tier) => {
            const taskClass = activeTaskClass;
            const isActive = taskClass?.id === tier.taskClassId;
            const isLocked = !taskClass;

            return (
              <div
                key={tier.taskClassId}
                className={`relative rounded-2xl border p-5 transition ${
                  isActive
                    ? "border-[var(--brand-gold)] bg-[var(--brand-gold)]/10"
                    : "border-white/10 bg-white/5"
                } ${isLocked ? "opacity-50" : ""}`}
              >
                {isActive && (
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-[var(--brand-gold)] px-2 py-0.5 text-[10px] font-semibold text-black">
                    <MdVerified className="text-xs" />
                    Active
                  </span>
                )}
                {isLocked && (
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/50">
                    <MdLock className="text-xs" />
                    Locked
                  </span>
                )}

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]">
                  <MdPaid className="text-xl" />
                </div>

                <div className="mt-4 text-sm font-semibold text-white">
                  Tier {tier.tier}
                </div>
                <div className="mt-1 text-xs text-white/50">
                  {tier.taskClassName}
                </div>

                <div className="mt-3 text-xl font-semibold text-[var(--brand-gold)]">
                  {tier.commissionRate}% commission
                </div>
                <p className="mt-2 text-xs text-white/60">
                  Referral count target: {tier.referralTarget}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-xs leading-relaxed text-white/60 md:text-sm">
        You earn <strong className="text-white">5%</strong> of the{" "}
        <strong className="text-white">cashout amount</strong> (USD) when a
        referred friend&apos;s withdrawal is completed successfully (paid
        out). Pending requests do not earn referral credit. If they cancel
        before completion, no referral credit applies. If a bonus was issued
        in error, it may be reversed. Self-referrals are not allowed.
      </div>
    </div>
  );
}
