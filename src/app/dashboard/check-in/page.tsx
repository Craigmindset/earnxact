"use client";

import { useEffect, useState } from "react";
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
import { createClient } from "@/lib/supabase/client";

// Backend integration point:
// - Every claim is recorded in public.daily_checkins (one row per user per
//   Nigeria/Africa-Lagos calendar day). The reward amount paid is whatever
//   public.checkin_settings.reward_price was at claim time - update that
//   single row via SQL to change the reward going forward, no deploy needed.
// - Streaks, wallet crediting and the 'bonus' transactions log are all
//   handled atomically by claim_daily_checkin() in
//   supabase/migrations/0001_init.sql.
type DayStatus = "completed" | "next" | "milestone" | "locked" | "grand";

// Returns the caller's current Nigeria (Africa/Lagos) calendar date as
// YYYY-MM-DD, matching the format Postgres returns for a `date` column - so
// it can be compared directly against daily_checkins.check_in_date.
function getNigeriaDateString(date: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(date);
}

// Builds the 7-day visual progress row from the user's real streak. Purely
// decorative (day 3 / day 7 highlight a scratch card / lucky wheel) - the
// actual reward paid is flat, driven by checkin_settings.reward_price.
function buildDayNodes(streak: number, checkedInToday: boolean): { day: number; status: DayStatus }[] {
  const cyclePosition = checkedInToday ? ((streak - 1) % 7) + 1 : (streak % 7) + 1;

  return Array.from({ length: 7 }, (_, i) => {
    const day = i + 1;
    let status: DayStatus;

    if (checkedInToday && day <= cyclePosition) status = "completed";
    else if (!checkedInToday && day < cyclePosition) status = "completed";
    else if (!checkedInToday && day === cyclePosition) status = "next";
    else if (day === 3) status = "milestone";
    else if (day === 7) status = "grand";
    else status = "locked";

    return { day, status };
  });
}

export default function CheckInPage() {
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [rewardPrice, setRewardPrice] = useState(10);
  const [streak, setStreak] = useState(0);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [lifetimeEarnings, setLifetimeEarnings] = useState(0);
  const [totalCheckIns, setTotalCheckIns] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const [{ data: settings }, { data: checkins }] = await Promise.all([
        supabase.from("checkin_settings").select("reward_price").limit(1).maybeSingle(),
        supabase
          .from("daily_checkins")
          .select("check_in_date, streak, reward")
          .eq("user_id", user.id)
          .order("check_in_date", { ascending: false })
      ]);

      if (cancelled) return;

      if (settings?.reward_price != null) {
        setRewardPrice(Number(settings.reward_price));
      }

      const rows = checkins ?? [];
      const latest = rows[0];
      const todayStr = getNigeriaDateString();

      setStreak(latest ? latest.streak : 0);
      setHasCheckedInToday(latest ? latest.check_in_date === todayStr : false);
      setTotalCheckIns(rows.length);
      setLifetimeEarnings(rows.reduce((sum, row) => sum + Number(row.reward), 0));
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleClaim() {
    setClaiming(true);
    setClaimError(null);

    const supabase = createClient();
    const { data, error } = await supabase.rpc("claim_daily_checkin");

    if (error) {
      setClaimError(error.message);
      setClaiming(false);
      return;
    }

    const result = data?.[0];
    if (result) {
      setStreak(result.streak);
      setRewardPrice(Number(result.reward));
      setHasCheckedInToday(true);
      setLifetimeEarnings((prev) => prev + Number(result.reward));
      setTotalCheckIns((prev) => prev + 1);
    }

    setClaiming(false);
  }

  const dayNodes = buildDayNodes(streak, hasCheckedInToday);
  const canClaim = !loading && !claiming && !hasCheckedInToday;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white md:text-3xl">
          Daily Check-In
        </h1>
        <p className="mt-1 text-sm text-white/50">
          Claim once per day (Nigeria time). Day 3 unlocks a free Starter
          scratch card, and day 7 unlocks a Lucky Wheel spin.
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
              Come back each day before midnight (Nigeria time) to keep your
              streak and unlock scratch cards.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-start justify-between gap-1 overflow-x-auto sm:gap-2">
          {dayNodes.map((node) => (
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
          onClick={handleClaim}
          disabled={!canClaim}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-gold)] px-4 py-3 text-sm font-semibold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:bg-zinc-800/80 disabled:text-white/40 disabled:hover:brightness-100"
        >
          <MdCardGiftcard className="text-lg" />
          {loading
            ? "Loading..."
            : claiming
              ? "Claiming..."
              : hasCheckedInToday
                ? "Come back tomorrow"
                : `Claim ${CURRENCY_SYMBOL}${rewardPrice.toFixed(2)}`}
        </button>

        {claimError && (
          <p className="mt-2 text-xs text-red-400">{claimError}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]">
            <MdLocalFireDepartment className="text-xl" />
          </div>
          <div>
            <div className="text-lg font-semibold text-white">
              Day {streak}
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
              {lifetimeEarnings.toFixed(2)}
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
              {totalCheckIns}
            </div>
            <div className="text-xs text-white/50">Total check-ins</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
        <h2 className="text-base font-bold text-white">More to claim ahead</h2>

        <div className="mt-4 divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <div
              key={day}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition hover:bg-white/5"
            >
              <span className="font-medium text-white/80">Day {day}</span>
              <span className="text-white/50">Yours to claim</span>
              <span className="text-right font-semibold text-[var(--brand-gold)]">
                {CURRENCY_SYMBOL}
                {rewardPrice.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 p-4 text-xs leading-relaxed text-white/60">
          <MdInfoOutline className="mt-0.5 shrink-0 text-sm text-[var(--brand-gold)]" />
          <div>
            <div className="mb-1 text-sm font-semibold text-white">
              How it works
            </div>
            Never skip a day check-in, claim your EarnXact returns. Check-in
            resets at midnight Nigeria time - miss a day and your streak
            starts back at day 1.
          </div>
        </div>
      </div>
    </div>
  );
}
