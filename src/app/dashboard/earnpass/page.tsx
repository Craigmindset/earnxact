"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { MdBolt, MdClose, MdInfoOutline, MdTrendingUp, MdWorkspacePremium } from "react-icons/md";
import { CURRENCY_SYMBOL } from "@/lib/currency";
import { DAILY_VIDEO_COUNT, EARNING_DAYS_PER_WEEK, EARNING_WEEKS, getRoiSplit } from "@/lib/earnings";
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
  const [infoPlan, setInfoPlan] = useState<MembershipPlanRow | null>(null);
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

  function closeInfoModal() {
    setInfoPlan(null);
  }

  // Starts a Paystack checkout for selectedPlan (see
  // src/app/api/payments/initialize) and redirects the browser to
  // Paystack's hosted payment page. Paystack redirects back to
  // /dashboard/earnpass/verify, which confirms the payment and applies the
  // plan via src/app/api/payments/verify.
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
            const planAmount = Number(plan.amount);
            const roi = getRoiSplit(planAmount);
            // Every plan except the default "Free" plan and the starter
            // "Task class1" tier gets the bonus badge - matched by name
            // (not array position) so it stays correct regardless of how
            // plans are ordered/priced. Seeded DB name has no space before
            // the digit (see supabase/migrations/0002_membership_plans_and_tasks.sql).
            const planNameLower = plan.name.trim().toLowerCase().replace(/\s+/g, " ");
            const hasBonus = planNameLower !== "free" && planNameLower !== "task class1";

            return (
              <div
                key={plan.id}
                className={`flex min-h-[18rem] flex-col justify-between rounded-2xl border p-6 ${
                  isCurrent
                    ? "border-[var(--brand-gold)]/50 bg-[var(--brand-gold)]/5"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]">
                        <Icon className="text-xl" />
                      </div>

                      <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-white">
                        {plan.name}
                        {isCurrent && (
                          <span className="rounded-full bg-[var(--brand-gold)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-gold)]">
                            Current
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {hasBonus && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-400">
                          +{BONUS_PERCENT}% bonus
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setInfoPlan(plan)}
                        aria-label={`View earning details for ${plan.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:border-[var(--brand-gold)]/40 hover:text-[var(--brand-gold)]"
                      >
                        <MdInfoOutline className="text-base" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-start justify-between gap-4">
                    <div className="text-2xl font-semibold text-[var(--brand-gold)]">
                      {CURRENCY_SYMBOL}
                      {planAmount.toLocaleString()}
                    </div>
                    {planAmount > 0 ? (
                      <div className="max-w-[11rem] text-right">
                        <p className="text-sm leading-tight text-white/70">
                          6-week return: <span className="font-semibold text-emerald-400">{CURRENCY_SYMBOL}{roi.sixWeekReturn.toLocaleString()}</span>
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-white/55">
                          Est. daily earnings: {CURRENCY_SYMBOL}{roi.dailyTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    ) : null}
                  </div>
                  {plan.description && (
                    <p className="mt-12 text-xs leading-relaxed text-white/60">
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

      {infoPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={closeInfoModal}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[var(--brand-card-1)] p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Earning journey details</h3>
                <p className="mt-1 text-sm text-white/60">{infoPlan.name}</p>
              </div>
              <button
                type="button"
                onClick={closeInfoModal}
                aria-label="Close earning details"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <MdClose className="text-lg" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm leading-relaxed text-white/75">
              <p>
                Earn financial rewards using Earnxact, watch videos, engage in task daily and earn legitimately.
              </p>
              {Number(infoPlan.amount) > 0 ? (
                <>
                  <p>
                    Earn from watching video, engaging task, check-in.
                  </p>
                  <p className="text-xs text-white/55">
                    Membership plan: {infoPlan.name}. Next daily earnings: {CURRENCY_SYMBOL}
                    {getRoiSplit(Number(infoPlan.amount)).dailyTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}.
                  </p>
                  <p className="text-xs text-white/55">
                    Daily split: {CURRENCY_SYMBOL}{getRoiSplit(Number(infoPlan.amount)).taskDailyReward.toLocaleString(undefined, { maximumFractionDigits: 2 })} from EarnXact tasks and {CURRENCY_SYMBOL}
                    {getRoiSplit(Number(infoPlan.amount)).videoDailyPool.toLocaleString(undefined, { maximumFractionDigits: 2 })} across {DAILY_VIDEO_COUNT} videos.
                  </p>
                  <p className="text-xs text-white/55">
                    Calculation: {CURRENCY_SYMBOL}{Number(infoPlan.amount).toLocaleString()} + 50% = {CURRENCY_SYMBOL}
                    {getRoiSplit(Number(infoPlan.amount)).sixWeekReturn.toLocaleString()}, spread across {EARNING_DAYS_PER_WEEK} days weekly for {EARNING_WEEKS} weeks.
                  </p>
                  <div className="h-px bg-white/10" />
                </>
              ) : null}
              <p className="font-medium text-emerald-400">
                Earn additional 50% bonus when you refer a user to any membership plan.
              </p>
            </div>
          </div>
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
                <div className="mt-1 flex items-start justify-between gap-4">
                  <div className="text-xl font-semibold text-[var(--brand-gold)]">
                    {CURRENCY_SYMBOL}
                    {Number(selectedPlan.amount).toLocaleString()}
                  </div>
                  <div className="max-w-[11rem] text-right">
                    <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/45">
                      Your returned earnings in 6 weeks
                    </div>
                    <div className="mt-1 text-sm font-semibold text-emerald-400">
                      {CURRENCY_SYMBOL}
                      {getRoiSplit(Number(selectedPlan.amount)).sixWeekReturn.toLocaleString()}
                    </div>
                  </div>
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
