"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { MdBolt, MdTrendingUp, MdWorkspacePremium } from "react-icons/md";
import { CURRENCY_SYMBOL } from "@/lib/currency";
import { TASK_CLASSES } from "@/components/dashboard/task-class-data";
import { createClient } from "@/lib/supabase/client";
import type { MembershipPlanRow } from "@/lib/database.types";

// Backend integration point:
// - Cards below are populated live from public.membership_plans (admin-
//   managed via SQL - see supabase/migrations/0002_membership_plans_and_tasks.sql).
// - Wire each "Get" action into your task-class registration/payment flow.
// - The user's current plan (user_profile.membership_plan_id) is highlighted
//   and shown as "Current Plan" instead of "Get".

// task-class-data.ts still owns the decorative icon per plan name (the
// membership_plans table itself has no icon column) - matched case-
// insensitively so DB naming quirks (e.g. "mid executive") still resolve.
const ICON_BY_PLAN_NAME = new Map(
  TASK_CLASSES.map((taskClass) => [taskClass.name.trim().toLowerCase(), taskClass.icon])
);

function iconForPlan(name: string) {
  return ICON_BY_PLAN_NAME.get(name.trim().toLowerCase()) ?? MdWorkspacePremium;
}

export default function EarnPassPage() {
  const [plans, setPlans] = useState<MembershipPlanRow[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const [{ data: planRows }, { data: userRes }] = await Promise.all([
        supabase
          .from("membership_plans")
          .select("id, name, amount, description, is_available, created_at")
          .order("amount", { ascending: true }),
        supabase.auth.getUser()
      ]);

      if (cancelled) return;

      setPlans(planRows ?? []);

      const uid = userRes?.user?.id;
      if (uid) {
        const { data: profile } = await supabase
          .from("user_profile")
          .select("membership_plan_id")
          .eq("user_id", uid)
          .maybeSingle();

        if (!cancelled) {
          setCurrentPlanId(profile?.membership_plan_id ?? null);
        }
      }

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-white/10">
        <Image
          src="/images/earnpass-bg.jpg"
          alt=""
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />

        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-3 py-1 text-xs font-semibold text-[var(--brand-gold)]">
            <MdBolt className="text-sm" />
            Unlock higher payouts
          </div>

          <h1 className="mt-4 max-w-xl text-3xl font-semibold leading-tight text-white md:text-4xl">
            Level up your EarnPass and earn bigger, faster.
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70 md:text-base">
            Choose a task class that matches your ambition. Higher classes
            unlock premium tasks, priority payouts and exclusive rewards.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-2xl border border-white/10 bg-white/5"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const Icon = iconForPlan(plan.name);
            const isCurrent = plan.id === currentPlanId;

            return (
              <div
                key={plan.id}
                className={`flex flex-col justify-between rounded-2xl border p-5 ${
                  isCurrent
                    ? "border-[var(--brand-gold)]/50 bg-[var(--brand-gold)]/5"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]">
                    <Icon className="text-xl" />
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-white">
                    {plan.name}
                    {isCurrent && (
                      <span className="rounded-full bg-[var(--brand-gold)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-gold)]">
                        Current
                      </span>
                    )}
                  </div>

                  <div className="mt-2 text-2xl font-semibold text-[var(--brand-gold)]">
                    {CURRENCY_SYMBOL}
                    {Number(plan.amount).toLocaleString()}
                  </div>
                  {plan.description && (
                    <p className="mt-2 text-xs leading-relaxed text-white/60">
                      {plan.description}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!plan.is_available || isCurrent}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-smoky-white)] px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
                >
                  {plan.is_available && !isCurrent && <MdTrendingUp className="text-base" />}
                  {isCurrent ? "Current Plan" : plan.is_available ? "Get" : "Unavailable"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
