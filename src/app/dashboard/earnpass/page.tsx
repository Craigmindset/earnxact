"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { MdBolt, MdClose, MdTrendingUp, MdWorkspacePremium } from "react-icons/md";
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

// Task Class 1 (the lowest/starter tier) doesn't carry the bonus badge -
// every plan ranked below it (plans are loaded ordered by amount ascending)
// gets the "+5% bonus" badge.
const BONUS_PERCENT = 5;

type CheckoutUser = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
};

export default function EarnPassPage() {
  const [plans, setPlans] = useState<MembershipPlanRow[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutUser, setCheckoutUser] = useState<CheckoutUser>({
    firstName: null,
    lastName: null,
    email: null,
    phone: null
  });
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlanRow | null>(null);
  const [paying, setPaying] = useState(false);
  const [payMessage, setPayMessage] = useState<string | null>(null);

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
          .select("membership_plan_id, first_name, last_name, email, phone_num")
          .eq("user_id", uid)
          .maybeSingle();

        if (!cancelled) {
          setCurrentPlanId(profile?.membership_plan_id ?? null);
          setCheckoutUser({
            firstName: profile?.first_name ?? null,
            lastName: profile?.last_name ?? null,
            email: profile?.email ?? userRes?.user?.email ?? null,
            phone: profile?.phone_num ?? null
          });
        }
      }

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function openCheckout(plan: MembershipPlanRow) {
    setPayMessage(null);
    setSelectedPlan(plan);
  }

  function closeCheckout() {
    if (paying) return;
    setSelectedPlan(null);
    setPayMessage(null);
  }

  // Backend integration point:
  // - Wire this into the Paystack initialize/verify flow
  //   (src/app/api/payments/initialize, src/app/api/payments/verify) to
  //   charge selectedPlan.amount and, on success, update
  //   user_profile.membership_plan_id to selectedPlan.id.
  async function handlePayNow() {
    if (!selectedPlan || paying) return;
    setPaying(true);
    setPayMessage(null);

    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlan.id })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.authorizationUrl) {
        setPayMessage(data?.error ?? "Payments are not available yet. Please try again soon.");
        return;
      }

      window.location.href = data.authorizationUrl;
    } catch {
      setPayMessage("Payments are not available yet. Please try again soon.");
    } finally {
      setPaying(false);
    }
  }

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
            // Every plan except the default "Free" plan and the starter
            // "Task Class 1" tier gets the bonus badge - matched by name
            // (not array position) so it stays correct regardless of how
            // plans are ordered/priced.
            const planNameLower = plan.name.trim().toLowerCase();
            const hasBonus = planNameLower !== "free" && planNameLower !== "task class 1";

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
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]">
                        <Icon className="text-xl" />
                      </div>

                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        {plan.name}
                        {isCurrent && (
                          <span className="rounded-full bg-[var(--brand-gold)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-gold)]">
                            Current
                          </span>
                        )}
                      </div>
                    </div>

                    {hasBonus && (
                      <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-400">
                        +{BONUS_PERCENT}% bonus
                      </span>
                    )}
                  </div>

                  <div className="mt-4 text-2xl font-semibold text-[var(--brand-gold)]">
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
                  onClick={() => openCheckout(plan)}
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

      {selectedPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={closeCheckout}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--brand-card-1)] p-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Confirm your EarnPass</h3>
              <button
                type="button"
                onClick={closeCheckout}
                aria-label="Close"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <MdClose className="text-lg" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-medium text-white/50">First name</div>
                  <div className="mt-1 truncate text-sm text-white">
                    {checkoutUser.firstName || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-white/50">Last name</div>
                  <div className="mt-1 truncate text-sm text-white">
                    {checkoutUser.lastName || "—"}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-white/50">Email</div>
                <div className="mt-1 truncate text-sm text-white">
                  {checkoutUser.email || "—"}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-white/50">Phone number</div>
                <div className="mt-1 truncate text-sm text-white">
                  {checkoutUser.phone || "—"}
                </div>
              </div>

              <div className="h-px bg-white/10" />

              <div>
                <div className="text-xs font-medium text-white/50">Membership</div>
                <div className="mt-1 text-sm font-semibold text-white">{selectedPlan.name}</div>
              </div>

              <div>
                <div className="text-xs font-medium text-white/50">Amount</div>
                <div className="mt-1 text-xl font-semibold text-[var(--brand-gold)]">
                  {CURRENCY_SYMBOL}
                  {Number(selectedPlan.amount).toLocaleString()}
                </div>
              </div>

              {payMessage && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-400">
                  {payMessage}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handlePayNow}
              disabled={paying}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-smoky-white)] px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paying ? "Processing…" : "Pay Now"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
