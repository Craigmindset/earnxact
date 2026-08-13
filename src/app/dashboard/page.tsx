import Image from "next/image";
import Link from "next/link";
import {
  MdBolt,
  MdCardGiftcard,
  MdChecklist,
  MdFlag,
  MdOndemandVideo,
  MdTrendingUp
} from "react-icons/md";
import DashboardStats from "@/components/dashboard/DashboardStats";
import WalletBalanceStat from "@/components/dashboard/WalletBalanceStat";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  let firstName: string | null = null;
  let membershipPlanName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("user_profile")
      .select("first_name, membership_plans(name)")
      .eq("user_id", user.id)
      .single();
    firstName = profile?.first_name ?? null;
    const plan = profile?.membership_plans as { name: string } | { name: string }[] | null;
    membershipPlanName = Array.isArray(plan) ? plan[0]?.name ?? null : plan?.name ?? null;
  }

  // Every user is assigned a membership_plan_id at signup (defaults to the
  // Free plan - see handle_new_user() in supabase/migrations/0001_init.sql),
  // so drive this off the actual plan itself rather than the coarser
  // 3-value account_type - a user on Task class1 or Task Class2 is still
  // "standard" account_type but has already left the Free plan.
  const planNameLower = membershipPlanName?.trim().toLowerCase() ?? null;
  const isOnFreePlan = planNameLower === null || planNameLower === "free";

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
            {isOnFreePlan
              ? "Earn More"
              : `You are currently on "${membershipPlanName}"`}
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
        <DashboardStats />
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
