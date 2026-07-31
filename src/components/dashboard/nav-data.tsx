import type { IconType } from "react-icons";
import { FaBitcoin } from "react-icons/fa6";
import {
  MdAccountBalanceWallet,
  MdAttachMoney,
  MdCardGiftcard,
  MdCardMembership,
  MdChecklist,
  MdEventAvailable,
  MdFlag,
  MdGroupAdd,
  MdHome,
  MdLeaderboard,
  MdOndemandVideo,
  MdOutlinePayments,
  MdSettings,
  MdSpeed,
  MdSupportAgent
} from "react-icons/md";

export type DashboardNavItem = {
  label: string;
  href: string;
  icon: IconType;
};

export const EARN_NAV_ITEMS: DashboardNavItem[] = [
  { label: "Earnxact", href: "/dashboard", icon: MdHome },
  { label: "Watch Ads", href: "/dashboard/watch-ads", icon: MdOndemandVideo },
  { label: "EarnXact Tasks", href: "/dashboard/tasks", icon: MdChecklist },
  { label: "Missions", href: "/dashboard/missions", icon: MdFlag },
  { label: "EarnPass", href: "/dashboard/earnpass", icon: MdCardMembership },
  { label: "Check in", href: "/dashboard/check-in", icon: MdEventAvailable },
  { label: "Giveaways", href: "/dashboard/giveaways", icon: MdCardGiftcard },
  { label: "Leaderboard", href: "/dashboard/leaderboard", icon: MdLeaderboard },
  { label: "Invite & Earn", href: "/dashboard/invite-earn", icon: MdGroupAdd },
  { label: "Cashback", href: "/dashboard/cashback", icon: MdAttachMoney },
  { label: "Wallet", href: "/dashboard/wallet", icon: MdAccountBalanceWallet },
  {
    label: "Account Settings",
    href: "/dashboard/account-settings",
    icon: MdSettings
  }
];

export const CASHOUT_NAV_ITEMS: DashboardNavItem[] = [
  { label: "Cash out", href: "/dashboard/cashout", icon: MdOutlinePayments },
  { label: "Crypto Payout", href: "/dashboard/crypto-payout", icon: FaBitcoin },
  { label: "Check in", href: "/dashboard/check-in", icon: MdEventAvailable },
  { label: "Giveaways", href: "/dashboard/giveaways", icon: MdCardGiftcard },
  { label: "Leaderboard", href: "/dashboard/leaderboard", icon: MdLeaderboard },
  { label: "Invite & Earn", href: "/dashboard/invite-earn", icon: MdGroupAdd },
  { label: "Cashback", href: "/dashboard/cashback", icon: MdAttachMoney },
  { label: "Quick Status", href: "/dashboard/quick-status", icon: MdSpeed },
  { label: "Support", href: "/dashboard/support", icon: MdSupportAgent }
];

// Routes that should default the sidebar to the "Cashout" tab when active.
export const CASHOUT_ONLY_ROUTES = new Set(["/dashboard/cashout", "/dashboard/crypto-payout"]);
