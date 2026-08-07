"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  MdCheck,
  MdClose,
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
import { createClient } from "@/lib/supabase/client";

// Backend integration point:
// - users_referred / referral_balance / last_claim_date come live from the
//   public.referral_data table (realtime-enabled) via Supabase Realtime.
// - The referral link itself is wired to referral_data.referral_link
//   (falls back to user_profile.user_referral_link / referral_code).
// - Every unclaimed referral reward is claimable right away (no minimum) -
//   keep REFERRAL_REWARD_AMOUNT in sync with handle_new_user() in
//   supabase/migrations/0001_init.sql.
const USERNAME = "you";
const REFERRAL_REWARD_AMOUNT = 50;

type ReferralStats = {
  firstName: string | null;
  referralLink: string | null;
  usersReferred: number;
  referralBalance: number;
  lastClaimDate: string | null;
};

// One row per claimed referral, sourced directly from public.referrals
// (referral_claim = true), newest claim first.
type ClaimHistoryEntry = {
  id: string;
  refereeName: string;
  rewardAmount: number;
  createdAt: string;
};

export default function InviteEarnPage() {
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyRows, setHistoryRows] = useState<ClaimHistoryEntry[]>([]);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function loadStats() {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        if (isMounted) setLoadingStats(false);
        return;
      }

      const { data } = await supabase
        .from("referral_data")
        .select("first_name, referral_link, users_referred, referral_balance, last_claim_date")
        .eq("user_id", user.id)
        .single();

      if (isMounted && data) {
        setStats({
          firstName: data.first_name,
          referralLink: data.referral_link,
          usersReferred: data.users_referred,
          referralBalance: Number(data.referral_balance),
          lastClaimDate: data.last_claim_date
        });
      }
      if (isMounted) setLoadingStats(false);

      // Live updates: whenever users_referred / referral_balance /
      // last_claim_date change (new referral credited, or a claim is made),
      // push the new values straight into the UI without a page refresh.
      channel = supabase
        .channel(`referral_data_${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "referral_data",
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            if (!isMounted) return;
            const row = payload.new as {
              first_name: string | null;
              referral_link: string | null;
              users_referred: number;
              referral_balance: number;
              last_claim_date: string | null;
            };
            setStats({
              firstName: row.first_name,
              referralLink: row.referral_link,
              usersReferred: row.users_referred,
              referralBalance: Number(row.referral_balance),
              lastClaimDate: row.last_claim_date
            });
          }
        )
        .subscribe();
    }

    loadStats();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const referralLink = stats?.referralLink ?? null;
  const usersReferred = stats?.usersReferred ?? 0;
  const referralBalance = stats?.referralBalance ?? 0;
  const totalEarning = usersReferred * REFERRAL_REWARD_AMOUNT;
  const displayName = stats?.firstName?.trim() || USERNAME;
  const lastClaim = stats?.lastClaimDate
    ? new Date(stats.lastClaimDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
      })
    : "--";

  const activeTaskClass = getCurrentTaskClass();
  const activeTier = REFERRAL_TIERS.find(
    (tier) => tier.taskClassId === activeTaskClass?.id
  );
  const commissionRate = activeTier?.commissionRate ?? 0;
  const canClaim = !claiming && referralBalance > 0;

  const shareTargets = useMemo(() => {
    const link = referralLink ?? "";
    return [
      {
        label: "Email",
        icon: MdEmail,
        href: `mailto:?subject=${encodeURIComponent("Join me on EarnXact")}&body=${encodeURIComponent(
          `Use my referral link to join EarnXact and start earning: ${link}`
        )}`
      },
      {
        label: "WhatsApp",
        icon: FaWhatsapp,
        href: `https://wa.me/?text=${encodeURIComponent(
          `Join me on EarnXact and start earning: ${link}`
        )}`
      },
      {
        label: "Facebook",
        icon: FaFacebook,
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`
      },
      {
        label: "Telegram",
        icon: FaTelegram,
        href: `https://t.me/share/url?url=${encodeURIComponent(
          link
        )}&text=${encodeURIComponent("Join me on EarnXact and start earning.")}`
      },
      {
        label: "X",
        icon: FaXTwitter,
        href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(
          link
        )}&text=${encodeURIComponent("Join me on EarnXact and start earning.")}`
      }
    ];
  }, [referralLink]);

  async function handleCopy() {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) - fail silently.
    }
  }

  async function handleClaim() {
    if (!canClaim) return;
    setClaiming(true);
    setClaimError(null);

    const supabase = createClient();
    const { data, error } = await supabase.rpc("claim_referral_balance");

    setClaiming(false);

    if (error) {
      setClaimError(error.message);
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;
    if (result) {
      // Optimistic update - the realtime subscription will also confirm this.
      setStats((prev) =>
        prev ? { ...prev, referralBalance: 0, lastClaimDate: new Date().toISOString() } : prev
      );
      // The referrals rows just got flipped to claimed - refresh the history
      // list if it's currently open so it reflects the new claim.
      if (showHistory) loadHistory();
    }
  }

  // Loads every referral this user has already claimed, straight from
  // public.referrals (referral_claim = true), newest first.
  async function loadHistory() {
    setHistoryLoading(true);
    setHistoryError(null);

    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setHistoryLoading(false);
      setHistoryError("You need to be signed in to view your claim history.");
      return;
    }

    const { data, error } = await supabase
      .from("referrals")
      .select("id, referee_first_name, referee_last_name, reward_amount, created_at")
      .eq("referrer_id", user.id)
      .eq("referral_claim", true)
      .order("created_at", { ascending: false });

    if (error) {
      setHistoryError(error.message);
      setHistoryLoading(false);
      return;
    }

    setHistoryRows(
      (data ?? []).map((row) => ({
        id: row.id,
        refereeName:
          [row.referee_first_name, row.referee_last_name].filter(Boolean).join(" ") ||
          "Anonymous user",
        rewardAmount: Number(row.reward_amount),
        createdAt: row.created_at
      }))
    );
    setHistoryLoading(false);
  }

  function openHistory() {
    setShowHistory(true);
    loadHistory();
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
                {displayName.slice(0, 1).toUpperCase()}
              </span>
              <span className="text-sm font-semibold text-white">
                @{displayName}
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
              {loadingStats ? "--" : referralBalance.toFixed(2)}
            </span>
            <button
              type="button"
              onClick={handleClaim}
              disabled={!canClaim}
              className="rounded-lg bg-[var(--brand-smoky-white)] px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
            >
              {claiming ? "Claiming..." : "Claim"}
            </button>
          </div>

          {claimError && (
            <p className="mt-2 text-xs text-red-400">{claimError}</p>
          )}

          <div className="my-5 border-t border-white/10" />

          <p className="text-xs leading-relaxed text-white/60">
            Use your referral link to invite & earn. Every referral reward is
            added here and can be claimed straight to your main balance at
            any time - no minimum.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <MdPeopleAlt className="text-lg text-[var(--brand-gold)]" />
              Referral Count
            </div>
            <button
              type="button"
              onClick={openHistory}
              aria-label="View claim history"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <MdHistory className="text-lg" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <MdPaid className="text-lg text-[var(--brand-gold)]" />
              <div className="mt-2 text-lg font-semibold text-white">
                {CURRENCY_SYMBOL}
                {loadingStats ? "--" : totalEarning.toFixed(2)}
              </div>
              <div className="mt-1 text-xs text-white/50">Total Earning</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <MdPeopleAlt className="text-lg text-[var(--brand-gold)]" />
              <div className="mt-2 text-lg font-semibold text-white">
                {loadingStats ? "--" : usersReferred}
              </div>
              <div className="mt-1 text-xs text-white/50">Users Referred</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <MdHistory className="text-lg text-[var(--brand-gold)]" />
              <div className="mt-2 text-lg font-semibold text-white">
                {loadingStats ? "--" : lastClaim}
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
                {loadingStats
                  ? "Loading your referral link..."
                  : (referralLink ?? "Referral link unavailable")}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!referralLink}
                aria-label="Copy referral link"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-smoky-white)] text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
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
              {shareTargets.map((target) => (
                <a
                  key={target.label}
                  href={referralLink ? target.href : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Share via ${target.label}`}
                  aria-disabled={!referralLink}
                  onClick={(event) => {
                    if (!referralLink) event.preventDefault();
                  }}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-white/80 transition hover:bg-white/10 hover:text-white ${
                    referralLink ? "" : "pointer-events-none opacity-40"
                  }`}
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

      {showHistory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShowHistory(false)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--brand-card-1)] p-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-semibold text-white">
                <MdHistory className="text-lg text-[var(--brand-gold)]" />
                Claim History
              </h3>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                aria-label="Close"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <MdClose className="text-lg" />
              </button>
            </div>

            <div className="mt-5 max-h-80 space-y-3 overflow-y-auto">
              {historyLoading ? (
                <p className="text-sm text-white/60">Loading your claim history...</p>
              ) : historyError ? (
                <p className="text-sm text-red-400">{historyError}</p>
              ) : historyRows.length === 0 ? (
                <p className="text-sm text-white/60">
                  You haven&apos;t claimed any referral bonuses yet.
                </p>
              ) : (
                historyRows.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-4 py-3"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white">
                        {entry.refereeName}
                      </span>
                      <span className="text-xs text-white/50">
                        {new Date(entry.createdAt).toLocaleString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-[var(--brand-gold)]">
                      {CURRENCY_SYMBOL}
                      {entry.rewardAmount.toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
