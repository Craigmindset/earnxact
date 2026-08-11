"use client";

import Image from "next/image";
import Link from "next/link";
import { MdNotificationsNone, MdSupportAgent, MdTrendingUp } from "react-icons/md";
import { FiMenu } from "react-icons/fi";
import { getCurrentTaskClass } from "@/components/dashboard/task-class-data";
import LogoutButton from "@/components/dashboard/LogoutButton";
import ProfileMenu from "@/components/dashboard/ProfileMenu";
import { CURRENCY_SYMBOL } from "@/lib/currency";
import { useUserProfile } from "@/hooks/useUserProfile";

type DashboardHeaderProps = {
  onToggleMobileSidebar: () => void;
};

export default function DashboardHeader({
  onToggleMobileSidebar
}: DashboardHeaderProps) {
  const { walletBalance, loading } = useUserProfile();
  const walletBalanceDisplay = `${CURRENCY_SYMBOL}${loading ? "0.00" : walletBalance.toFixed(2)}`;
  const activeTaskClass = getCurrentTaskClass();

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
        {activeTaskClass ? (
          <span className="hidden rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 sm:inline-flex">
            {activeTaskClass.name}
          </span>
        ) : (
          <span className="hidden items-center gap-2 sm:inline-flex">
            <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80">
              Earn More
            </span>
            <Link
              href="/dashboard/earnpass"
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand-smoky-white)] px-3 py-2 text-xs font-semibold text-black transition hover:opacity-90"
            >
              <MdTrendingUp className="text-sm" />
              Upgrade
            </Link>
          </span>
        )}

        <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-[var(--brand-gold)]">
          {walletBalanceDisplay}
        </span>

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
