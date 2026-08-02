"use client";

import {
  MdAttachMoney,
  MdCalendarToday,
  MdCardGiftcard,
  MdCasino,
  MdCheck,
  MdConfirmationNumber,
  MdInfoOutline,
  MdLocalFireDepartment
} from "react-icons/md";
import { CURRENCY_SYMBOL } from "@/lib/currency";
import { getCurrentTaskClass } from "@/components/dashboard/task-class-data";

type DayStatus = "completed" | "next" | "milestone" | "locked" | "grand";

const DAY_NODES: { day: number; status: DayStatus }[] = [
  { day: 1, status: "completed" },
  { day: 2, status: "next" },
  { day: 3, status: "milestone" },
  { day: 4, status: "locked" },
  { day: 5, status: "locked" },
  { day: 6, status: "locked" },
  { day: 7, status: "grand" }
];

// Backend integration point:
// - Replace the mock streak/metrics values below with the authenticated
//   user's real check-in history and rewards.
const CURRENT_STREAK = 1;
const LIFETIME_EARNINGS = 0.03;
const TOTAL_CHECK_INS = 1;

const UPCOMING_DAYS = [1, 2, 3, 4, 5, 6, 7];

// Backend integration point:
// - Replace with the real per-day check-in reward configured for the
//   user's active task class/category.
function getClaimAmount(taskClassId: string | null, day: number): number {
  if (!taskClassId) return 0;

  if (taskClassId === "team-class") return 50;
  if (taskClassId === "executive" || taskClassId === "senior-executive") return 2000;

  // Mid Executive down to Junior Manager (and other mid tiers) earn a
  // deterministic pseudo-random amount between 100 and 500.
  const seed = (day * 37 + taskClassId.length * 13) % 401;
  return 100 + seed;
}

export default function CheckInPage() {
  const activeTaskClass = getCurrentTaskClass();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white md:text-3xl">
          Daily Check-In
        </h1>
        <p className="mt-1 text-sm text-white/50">
          Claim once per day (UTC). Day 3 unlocks a free Starter scratch
          card, and day 7 unlocks a Lucky Wheel spin.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-6">
        <div className="absolute inset-y-0 left-0 w-1 bg-[var(--brand-gold)]" />

        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-gold)]/15 text-[var(--brand-gold)] shadow-[0_0_20px_rgba(244,163,0,0.35)]">
            <MdLocalFireDepartment className="text-2xl" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Your streak</h2>
            <p className="mt-1 text-sm text-white/50">
              Come back each day before UTC midnight to keep your streak and
              unlock scratch cards.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-start justify-between gap-1 overflow-x-auto sm:gap-2">
          {DAY_NODES.map((node) => (
            <div
              key={node.day}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
                Day {node.day}
              </span>

              {node.status === "completed" && (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-green-500 text-green-500">
                  <MdCheck className="text-lg" />
                </div>
              )}

              {node.status === "next" && (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm font-semibold text-white/70">
                  {node.day}
                </div>
              )}

              {node.status === "milestone" && (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-gold)] text-black shadow-[0_0_18px_rgba(244,163,0,0.55)]">
                  <MdConfirmationNumber className="text-lg" />
                </div>
              )}

              {node.status === "locked" && (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/20 text-sm font-semibold text-white/30">
                  {node.day}
                </div>
              )}

              {node.status === "grand" && (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white shadow-[0_0_18px_rgba(168,85,247,0.55)]">
                  <MdCasino className="text-lg" />
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          disabled
          className="mt-6 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-zinc-800/80 px-4 py-3 text-sm font-semibold text-white/40"
        >
          <MdCardGiftcard className="text-lg" />
          Come back tomorrow
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]">
            <MdLocalFireDepartment className="text-xl" />
          </div>
          <div>
            <div className="text-lg font-semibold text-white">
              Day {CURRENT_STREAK}
            </div>
            <div className="text-xs text-white/50">Current streak</div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-600/20 text-amber-500">
            <MdAttachMoney className="text-xl" />
          </div>
          <div>
            <div className="text-lg font-semibold text-white">
              {CURRENCY_SYMBOL}
              {LIFETIME_EARNINGS.toFixed(2)}
            </div>
            <div className="text-xs text-white/50">Lifetime from check-ins</div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-600/20 text-green-500">
            <MdCalendarToday className="text-xl" />
          </div>
          <div>
            <div className="text-lg font-semibold text-white">
              {TOTAL_CHECK_INS}
            </div>
            <div className="text-xs text-white/50">Total check-ins</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
        <h2 className="text-base font-bold text-white">More to claim ahead</h2>

        <div className="mt-4 divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10">
          {UPCOMING_DAYS.map((day) => {
            const amount = getClaimAmount(activeTaskClass?.id ?? null, day);

            return (
              <div
                key={day}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition hover:bg-white/5"
              >
                <span className="font-medium text-white/80">Day {day}</span>
                <span className="text-white/50">Yours to claim</span>
                <span className="text-right font-semibold text-[var(--brand-gold)]">
                  {activeTaskClass ? `${CURRENCY_SYMBOL}${amount.toLocaleString()}` : "Locked"}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 p-4 text-xs leading-relaxed text-white/60">
          <MdInfoOutline className="mt-0.5 shrink-0 text-sm text-[var(--brand-gold)]" />
          <div>
            <div className="mb-1 text-sm font-semibold text-white">
              How it works
            </div>
            Never skip a day check-in, claim your EarnXact returns. Please
            note check-in bonuses are fully categorized and may not be
            available to your category.
          </div>
        </div>
      </div>
    </div>
  );
}
