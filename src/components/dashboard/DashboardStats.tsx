"use client";

import { useEffect, useState } from "react";
import { MdAttachMoney, MdChecklist, MdEventAvailable } from "react-icons/md";
import { CURRENCY_SYMBOL } from "@/lib/currency";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import type { DailyCheckinRow, TaskSubmissionRow, TransactionRow } from "@/lib/database.types";

// Returns the caller's current Nigeria (Africa/Lagos) calendar date as
// YYYY-MM-DD.
function getNigeriaDateString(date: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(date);
}

/**
 * Renders the "Today's earnings" / "Tasks completed" / "Check-in streak"
 * stat cards on /dashboard using real, realtime data instead of hardcoded
 * zeros:
 * - Today's earnings: sum of today's (Africa/Lagos calendar day) 'credit'
 *   and 'bonus' transactions (task rewards, check-in reward, referral
 *   claims, offerwall credits, etc.) - see public.transactions, written by
 *   the various SECURITY DEFINER functions in supabase/migrations.
 * - Tasks completed: count of today's verified task_submissions.
 * - Check-in streak: the streak value from the user's most recent
 *   daily_checkins row (same value shown on /dashboard/check-in).
 * All three re-fetch live via postgres_changes so they update the moment a
 * task gets verified, a check-in is claimed, or a reward is credited -
 * without a page refresh.
 */
export default function DashboardStats() {
  const { userId } = useUserProfile();
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [checkinStreak, setCheckinStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const uid = userId;
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const todayStr = getNigeriaDateString();

      const [{ data: transactions }, { data: submissions }, { data: checkins }] = await Promise.all([
        supabase
          .from("transactions")
          .select("amount, type, created_at")
          .eq("user_id", uid)
          .in("type", ["credit", "bonus"]),
        supabase
          .from("task_submissions")
          .select("id, submitted_at, status")
          .eq("user_id", uid)
          .eq("status", "approved"),
        supabase
          .from("daily_checkins")
          .select("streak, check_in_date")
          .eq("user_id", uid)
          .order("check_in_date", { ascending: false })
          .limit(1)
      ]);

      if (cancelled) return;

      const earningsToday = (transactions ?? [])
        .filter((row) => getNigeriaDateString(new Date(row.created_at)) === todayStr)
        .reduce((sum, row) => sum + Number(row.amount), 0);

      setTodayEarnings(earningsToday);
      setTasksCompleted(
        (submissions ?? []).filter((row) => getNigeriaDateString(new Date(row.submitted_at)) === todayStr).length
      );
      setCheckinStreak(checkins?.[0]?.streak ?? 0);
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel(`dashboard_stats_${uid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: `user_id=eq.${uid}` },
        (payload) => {
          const row = payload.new as TransactionRow;
          if (row.type !== "credit" && row.type !== "bonus") return;
          if (getNigeriaDateString(new Date(row.created_at)) !== getNigeriaDateString()) return;
          setTodayEarnings((prev) => prev + Number(row.amount));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "task_submissions", filter: `user_id=eq.${uid}` },
        (payload) => {
          const row = payload.new as TaskSubmissionRow;
          if (row.status === "approved" && getNigeriaDateString(new Date(row.submitted_at)) === getNigeriaDateString()) {
            setTasksCompleted((prev) => prev + 1);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "task_submissions", filter: `user_id=eq.${uid}` },
        (payload) => {
          const row = payload.new as TaskSubmissionRow;
          if (row.status === "approved" && getNigeriaDateString(new Date(row.submitted_at)) === getNigeriaDateString()) {
            setTasksCompleted((prev) => prev + 1);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "daily_checkins", filter: `user_id=eq.${uid}` },
        (payload) => {
          const row = payload.new as DailyCheckinRow;
          setCheckinStreak(row.streak);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const stats = [
    {
      label: "Today's earnings",
      value: `${CURRENCY_SYMBOL}${loading ? "0.00" : todayEarnings.toFixed(2)}`,
      icon: MdAttachMoney
    },
    {
      label: "Tasks completed",
      value: loading ? "0" : String(tasksCompleted),
      icon: MdChecklist
    },
    {
      label: "Check-in streak",
      value: `${loading ? "0" : checkinStreak} days`,
      icon: MdEventAvailable
    }
  ];

  return (
    <>
      {stats.map(({ label, value, icon: Icon }) => (
        <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]">
            <Icon className="text-lg" />
          </div>
          <div className="mt-3 text-lg font-semibold text-white">{value}</div>
          <div className="text-xs text-white/60">{label}</div>
        </div>
      ))}
    </>
  );
}
