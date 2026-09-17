"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MdNotificationsNone, MdSupportAgent, MdTrendingUp } from "react-icons/md";
import { FiMenu } from "react-icons/fi";
import LogoutButton from "@/components/dashboard/LogoutButton";
import ProfileMenu from "@/components/dashboard/ProfileMenu";
import { CURRENCY_SYMBOL } from "@/lib/currency";
import { createClient } from "@/lib/supabase/client";
import type { MembershipPaymentSubmissionStatus } from "@/lib/database.types";
import { useUserProfile } from "@/hooks/useUserProfile";

type DashboardHeaderProps = {
  onToggleMobileSidebar: () => void;
};

export default function DashboardHeader({
  onToggleMobileSidebar
}: DashboardHeaderProps) {
  const { userId, walletBalance, membershipPlanName, loading } = useUserProfile();
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);
  const walletBalanceDisplay = `${CURRENCY_SYMBOL}${loading ? "0.00" : walletBalance.toFixed(2)}`;
  // Every user is assigned a membership_plan_id at signup (defaults to the
  // Free plan - see handle_new_user() in supabase/migrations/0001_init.sql),
  // so drive the badge/Upgrade-link off the actual plan itself rather than
  // the coarser 3-value account_type - a user on Task class1 or Task Class2
  // is still "standard" account_type but has already left the Free plan.
  const planNameLower = membershipPlanName?.trim().toLowerCase() ?? null;
  const isOnFreePlan = planNameLower === null || planNameLower === "free";

  useEffect(() => {
    if (!userId) {
      setPendingPaymentCount(0);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    async function loadPaymentStatus() {
      const { data, error } = await supabase.rpc("get_my_membership_payment_submissions");

      if (cancelled || error) return;

      setPendingPaymentCount(
        (data ?? []).filter((submission) => submission.status === "pending").length
      );
    }

    void loadPaymentStatus();

    const channel = supabase
      .channel(`membership_payment_submissions_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "membership_payment_submissions",
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (cancelled) return;

          const nextRow = payload.new as { status?: MembershipPaymentSubmissionStatus } | null;
          const previousRow = payload.old as { status?: MembershipPaymentSubmissionStatus } | null;

          setPendingPaymentCount((current) => {
            let nextCount = current;

            if (payload.eventType === "INSERT" && nextRow?.status === "pending") {
              nextCount += 1;
            }

            if (payload.eventType === "UPDATE") {
              if (previousRow?.status === "pending" && nextRow?.status !== "pending") {
                nextCount -= 1;
              }

              if (previousRow?.status !== "pending" && nextRow?.status === "pending") {
                nextCount += 1;
              }
            }

            if (payload.eventType === "DELETE" && previousRow?.status === "pending") {
              nextCount -= 1;
            }

            return Math.max(nextCount, 0);
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const paymentIndicatorLabel = useMemo(() => {
    if (pendingPaymentCount === 0) return "Payment status";
    if (pendingPaymentCount === 1) return "1 payment pending admin approval";
    return `${pendingPaymentCount} payments pending admin approval`;
  }, [pendingPaymentCount]);

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-3 border-b border-white/10 bg-[var(--brand-black)]/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-[color:rgba(5,5,5,0.8)] md:px-6">
      <button
        type="button"
        onClick={onToggleMobileSidebar}
        aria-label="Open menu"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:bg-white/10 md:hidden"
      >
        <FiMenu className="text-xl" />
      </button>

      <Link
        href="/dashboard"
        className="inline-flex items-center"
        aria-label="EarnXact Dashboard"
      >
        <Image
          src="/images/earnxact-logo.png"
          alt="EarnXact"
          width={160}
          height={40}
          priority
          className="h-8 w-auto sm:h-9"
        />
      </Link>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <span className="hidden items-center gap-2 sm:inline-flex">
          <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80">
            {loading ? "Earn More" : membershipPlanName ?? "Free"}
          </span>
          {isOnFreePlan && (
            <Link
              href="/dashboard/earnpass"
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand-smoky-white)] px-3 py-2 text-xs font-semibold text-black transition hover:opacity-90"
            >
              <MdTrendingUp className="text-sm" />
              Upgrade
            </Link>
          )}
        </span>

        <Link
          href="/dashboard/wallet"
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-[var(--brand-gold)] transition hover:bg-white/10"
        >
          {walletBalanceDisplay}
        </Link>

        <Link
          href="/dashboard/payment-status"
          aria-label={paymentIndicatorLabel}
          className={`relative inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            pendingPaymentCount > 0
              ? "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15"
              : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
          }`}
        >
          <span className="hidden sm:inline">Payment status</span>
          <span className="sm:hidden">Pay</span>
          {pendingPaymentCount > 0 && (
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-amber-400 px-1.5 py-0.5 text-[11px] font-bold text-black">
              {pendingPaymentCount}
            </span>
          )}
        </Link>

        <Link
          href="/dashboard/support"
          aria-label="Support"
          className="hidden h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 hover:text-white sm:inline-flex"
        >
          <MdSupportAgent className="text-lg" />
        </Link>

        <Link
          href="/dashboard/notifications"
          aria-label="Notifications"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <MdNotificationsNone className="text-lg" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--brand-gold)]" />
        </Link>

        <ProfileMenu />

        <LogoutButton variant="icon" />
      </div>
    </header>
  );
}
