import Image from "next/image";
import Link from "next/link";
import {
  MdAttachMoney,
  MdBolt,
  MdCardGiftcard,
  MdChecklist,
  MdEventAvailable,
  MdFlag,
  MdOndemandVideo,
  MdTrendingUp
} from "react-icons/md";
import { getCurrentTaskClass } from "@/components/dashboard/task-class-data";
import WalletBalanceStat from "@/components/dashboard/WalletBalanceStat";
import { CURRENCY_SYMBOL } from "@/lib/currency";
import { createClient } from "@/lib/supabase/server";

const STATS = [
  { label: "Today's earnings", value: `${CURRENCY_SYMBOL}0.00`, icon: MdAttachMoney },
  { label: "Tasks completed", value: "0", icon: MdChecklist },
  { label: "Check-in streak", value: "0 days", icon: MdEventAvailable }
] as const;

const QUICK_ACTIONS = [
  {
    label: "Watch Ads",
    description: "Watch short ads for instant rewards.",
    href: "/dashboard/watch-ads",
    icon: MdOndemandVideo
  },
  {
    label: "EarnXact Tasks",
    description: "Complete tasks to earn cash.",
    href: "/dashboard/tasks",
    icon: MdChecklist
  },
  {
    label: "Missions",
    description: "Finish missions for bonus rewards.",
    href: "/dashboard/missions",
    icon: MdFlag
  },
  {
    label: "Giveaways",
    description: "Enter giveaways and win extra.",
    href: "/dashboard/giveaways",
    icon: MdCardGiftcard
  }
] as const;

export default async function DashboardPage() {
  // Backend/auth integration point:
  // - Protect this route with middleware or server-side auth checks.
  // - Fetch the authenticated user's wallet balance, stats and activity here.
  const activeTaskClass = getCurrentTaskClass();

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  let firstName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("user_profile")
      .select("first_name")
      .eq("user_id", user.id)
      .single();
    firstName = profile?.first_name ?? null;
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
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-3 py-1 text-xs font-semibold text-[var(--brand-gold)]">
            <MdBolt className="text-sm" />
            Your EarnXact dashboard
          </div>

          <h1 className="mt-4 text-2xl font-semibold text-white md:text-3xl">
            Welcome {firstName ? firstName : "back"} 👋
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70 md:text-base">
            Here&apos;s what&apos;s happening with your EarnXact account today.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-white/50">
            Task Class
          </div>
          <div className="mt-1 text-lg font-semibold text-white">
            {activeTaskClass
              ? `You are currently on "${activeTaskClass.name}"`
              : "Earn More"}
          </div>
        </div>
        <Link
          href="/dashboard/earnpass"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--brand-smoky-white)] px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
        >
          <MdTrendingUp className="text-lg" />
          Upgrade
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <WalletBalanceStat />
        {STATS.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]">
              <Icon className="text-lg" />
            </div>
            <div className="mt-3 text-lg font-semibold text-white">{value}</div>
            <div className="text-xs text-white/60">{label}</div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white">Quick actions</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map(({ label, description, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/10"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-white">
                <Icon className="text-xl" />
              </div>
              <div className="mt-3 text-sm font-semibold text-white">
                {label}
              </div>
              <div className="mt-1 text-xs text-white/50">{description}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
