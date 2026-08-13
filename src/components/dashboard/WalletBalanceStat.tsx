"use client";

import Link from "next/link";
import { MdAccountBalanceWallet } from "react-icons/md";
import { CURRENCY_SYMBOL } from "@/lib/currency";
import { useUserProfile } from "@/hooks/useUserProfile";

/**
 * Renders the "Wallet balance" stat card using the real, realtime
 * user_profile.wallet_balance (via useUserProfile) instead of a hardcoded
 * value, so it updates immediately when the balance changes (e.g. a
 * referral claim credits the wallet). Links to /dashboard/wallet so
 * clicking it takes the user straight to the withdraw page.
 */
export default function WalletBalanceStat() {
  const { walletBalance, loading } = useUserProfile();

  return (
    <Link
      href="/dashboard/wallet"
      className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/15 hover:bg-white/10"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]">
        <MdAccountBalanceWallet className="text-lg" />
      </div>
      <div className="mt-3 text-lg font-semibold text-white">
        {CURRENCY_SYMBOL}
        {loading ? "0.00" : walletBalance.toFixed(2)}
      </div>
      <div className="text-xs text-white/60">Wallet balance</div>
    </Link>
  );
}
