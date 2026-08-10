"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MdBolt, MdFlag, MdStars } from "react-icons/md";
import { getCurrentTaskClass } from "@/components/dashboard/task-class-data";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { formatCurrency } from "@/lib/currency";

// Backend integration point:
// - Missions with a `missionId` below are backed by real data:
//   get_mission_status() computes live progress from public.offerwall_transactions
//   (written by provider postback routes, e.g. /api/postbacks/cpx), and
//   claim_mission() re-verifies the goal server-side before crediting the
//   reward - see supabase/migrations/0001_init.sql. Goal thresholds/rewards
//   are admin-managed in mission_catalog via SQL, not in this file.
// - Tasks / Watch Ads / Giveaways missions stay static placeholders for now
//   (their own backends aren't wired to mission progress yet).

type Tag = { label: string; tone: "brown" | "dark" };

type MissionGoalFormat = "currency" | "count";

type MissionCardData = {
  index: string;
  tags: Tag[];
  title: string;
  description: ReactNode;
  reward: number;
  actionLabel: string;
  actionHref?: string;
  /** Present only for missions backed by get_mission_status()/claim_mission(). */
  missionId?: string;
  goalFormat?: MissionGoalFormat;
};

type MissionStatus = {
  progress: number;
  goal_target: number;
  reward: number;
  completed: boolean;
  claimed: boolean;
};

const DAILY_MISSIONS: MissionCardData[] = [
  {
    index: "01",
    tags: [
      { label: "CPX", tone: "brown" },
      { label: "TODAY", tone: "dark" }
    ],
    title: `${formatCurrency(2)}+ credited on CPX today`,
    description: (
      <>
        Reach <strong className="font-semibold text-white">{formatCurrency(2)}+</strong>{" "}
        in CPX Research credits before the UTC day rolls.
      </>
    ),
    reward: 20,
    actionLabel: "Open CPX",
    actionHref: "/dashboard/watch-ads",
    missionId: "cpx_two_dollars_daily",
    goalFormat: "currency"
  },
  {
    index: "02",
    tags: [
      { label: "WALLS", tone: "brown" },
      { label: "TODAY", tone: "dark" }
    ],
    title: "Earn on two different walls today",
    description: (
      <>
        Get credited from{" "}
        <strong className="font-semibold text-white">two different</strong>{" "}
        offer-wall sources (e.g. CPX, TimeWall, AdGem) the same UTC day.
      </>
    ),
    reward: 25,
    actionLabel: "Offerwall hub",
    actionHref: "/dashboard/watch-ads",
    missionId: "walls_two_providers_daily",
    goalFormat: "count"
  },
  {
    index: "03",
    tags: [
      { label: "WATCH ADS", tone: "brown" },
      { label: "TODAY", tone: "dark" }
    ],
    title: "25+ rewarded ads, fully watched",
    description: (
      <>
        Finish <strong className="font-semibold text-white">25</strong>{" "}
        rewarded video views all the way through today (same UTC day).
      </>
    ),
    reward: 2,
    actionLabel: "Watch Ads",
    actionHref: "/dashboard/watch-ads"
  },
  {
    index: "04",
    tags: [
      { label: "GIVEAWAYS", tone: "brown" },
      { label: "TODAY", tone: "dark" }
    ],
    title: "Enter a giveaway with 1+ ticket",
    description: (
      <>
        Join any giveaway round and enter with{" "}
        <strong className="font-semibold text-white">at least 1 ticket</strong>{" "}
        before the UTC day resets.
      </>
    ),
    reward: 5,
    actionLabel: "Open Giveaways",
    actionHref: "/dashboard/giveaways"
  }
];

const WEEKLY_MISSIONS: MissionCardData[] = [
  {
    index: "01",
    tags: [
      { label: "TASKS", tone: "brown" },
      { label: "MON–SUN UTC", tone: "dark" }
    ],
    title: "Two paid Task completions this week",
    description: (
      <>
        <strong className="font-semibold text-white">Two</strong> Tasks
        marked paid with credit time falling in the current UTC week
        (Monday–Sunday).
      </>
    ),
    reward: 5,
    actionLabel: "Open Tasks",
    actionHref: "/dashboard/tasks"
  },
  {
    index: "02",
    tags: [
      { label: "WALLS", tone: "brown" },
      { label: "MON–SUN UTC", tone: "dark" }
    ],
    title: `${formatCurrency(15)}+ from walls this UTC week`,
    description: (
      <>
        <strong className="font-semibold text-white">{formatCurrency(15)}+</strong>{" "}
        combined from offer-wall credits Monday–Sunday UTC.
      </>
    ),
    reward: 100,
    actionLabel: "Offerwall hub",
    actionHref: "/dashboard/watch-ads",
    missionId: "walls_total_amount_weekly",
    goalFormat: "currency"
  },
  {
    index: "03",
    tags: [
      { label: "CPX", tone: "brown" },
      { label: "MON–SUN UTC", tone: "dark" }
    ],
    title: `${formatCurrency(5)}+ credited on CPX this week`,
    description: (
      <>
        Reach <strong className="font-semibold text-white">{formatCurrency(5)}+</strong> in
        CPX Research credits Monday–Sunday UTC.
      </>
    ),
    reward: 15,
    actionLabel: "Open CPX",
    actionHref: "/dashboard/watch-ads",
    missionId: "cpx_five_dollars_weekly",
    goalFormat: "currency"
  },
  {
    index: "04",
    tags: [
      { label: "WATCH ADS", tone: "brown" },
      { label: "MON–SUN UTC", tone: "dark" }
    ],
    title: "120+ rewarded ads this UTC week",
    description: (
      <>
        Finish <strong className="font-semibold text-white">120</strong>{" "}
        rewarded video views all the way through, summed across the UTC week.
      </>
    ),
    reward: 10,
    actionLabel: "Watch Ads",
    actionHref: "/dashboard/watch-ads"
  }
];

function MissionTag({ tag }: { tag: Tag }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
        tag.tone === "brown"
          ? "bg-amber-900/40 text-amber-300"
          : "bg-black/40 text-white/50"
      }`}
    >
      {tag.label}
    </span>
  );
}

function formatGoalProgress(status: MissionStatus, format: MissionGoalFormat) {
  if (format === "currency") {
    return `${formatCurrency(status.progress)} / ${formatCurrency(status.goal_target)}`;
  }
  return `${status.progress} / ${status.goal_target} walls`;
}

function MissionCard({
  mission,
  status,
  claiming,
  onClaim
}: {
  mission: MissionCardData;
  status?: MissionStatus;
  claiming: boolean;
  onClaim: (missionId: string) => void;
}) {
  const reward = status?.reward ?? mission.reward;

  let footerNote: ReactNode = "In progress - complete the goal to unlock a claim.";
  let actionNode: ReactNode;

  if (mission.missionId) {
    const missionId = mission.missionId;
    if (!status) {
      footerNote = "Loading progress\u2026";
      actionNode = (
        <button
          type="button"
          disabled
          className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/40 sm:shrink-0"
        >
          Loading…
        </button>
      );
    } else if (status.claimed) {
      footerNote = "Claimed - this mission resets next window.";
      actionNode = (
        <button
          type="button"
          disabled
          className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/40 sm:shrink-0"
        >
          Claimed
        </button>
      );
    } else if (status.completed) {
      footerNote = `Goal reached: ${formatGoalProgress(status, mission.goalFormat ?? "currency")}`;
      actionNode = (
        <button
          type="button"
          disabled={claiming}
          onClick={() => onClaim(missionId)}
          className="inline-flex items-center justify-center rounded-lg bg-[var(--brand-gold)] px-4 py-2 text-xs font-semibold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 sm:shrink-0"
        >
          {claiming ? "Claiming\u2026" : "Claim reward"}
        </button>
      );
    } else {
      footerNote = `Progress: ${formatGoalProgress(status, mission.goalFormat ?? "currency")}`;
      actionNode = mission.actionHref ? (
        <Link
          href={mission.actionHref}
          className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 sm:shrink-0"
        >
          {mission.actionLabel}
        </Link>
      ) : undefined;
    }
  } else {
    actionNode = mission.actionHref ? (
      <Link
        href={mission.actionHref}
        className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 sm:shrink-0"
      >
        {mission.actionLabel}
      </Link>
    ) : (
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 sm:shrink-0"
      >
        {mission.actionLabel}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-2xl font-bold text-white/10 md:text-3xl">
          {mission.index}
        </span>
        <div className="flex items-center gap-2">
          {mission.tags.map((tag) => (
            <MissionTag key={tag.label} tag={tag} />
          ))}
        </div>
      </div>

      <div className="mt-3">
        <h3 className="text-sm font-semibold text-white md:text-base">
          {mission.title}
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-white/60 md:text-sm">
          {mission.description}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-white/50">
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand-gold)]">
            <MdStars className="text-base" />+{reward}
          </span>
          {footerNote}
        </div>

        {actionNode}
      </div>
    </div>
  );
}

function MissionTimeline({
  missions,
  lineColor,
  missionStatus,
  claimingId,
  onClaim
}: {
  missions: MissionCardData[];
  lineColor: string;
  missionStatus: Record<string, MissionStatus>;
  claimingId: string | null;
  onClaim: (missionId: string) => void;
}) {
  return (
    <div className="relative">
      <div className={`absolute left-4 top-2 bottom-2 w-px ${lineColor}`} />

      <div className="space-y-5">
        {missions.map((mission) => (
          <div key={`${mission.index}-${mission.title}`} className="relative pl-10">
            <span
              className={`absolute left-4 top-6 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-[var(--brand-black)] ${lineColor.replace(
                "bg-",
                "border-"
              )}`}
            />
            <MissionCard
              mission={mission}
              status={mission.missionId ? missionStatus[mission.missionId] : undefined}
              claiming={claimingId === mission.missionId}
              onClaim={onClaim}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MissionsPage() {
  const activeTaskClass = getCurrentTaskClass();
  const { userId } = useUserProfile();

  const [missionStatus, setMissionStatus] = useState<Record<string, MissionStatus>>({});
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const uid = userId;
    let cancelled = false;
    const supabase = createClient();

    async function loadMissionStatus() {
      const { data } = await supabase.rpc("get_mission_status");
      if (cancelled || !data) return;

      const next: Record<string, MissionStatus> = {};
      for (const row of data) {
        next[row.mission_id] = {
          progress: row.progress,
          goal_target: row.goal_target,
          reward: row.reward,
          completed: row.completed,
          claimed: row.claimed
        };
      }
      setMissionStatus(next);
    }

    loadMissionStatus();

    // Any new credited/reversed offerwall transaction or claimed mission for
    // this user can change progress/claim state - just re-run the RPC rather
    // than re-deriving the same aggregation logic on the client.
    const channel = supabase
      .channel(`mission_progress_${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "offerwall_transactions", filter: `user_id=eq.${uid}` },
        () => loadMissionStatus()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "users_mission", filter: `user_id=eq.${uid}` },
        () => loadMissionStatus()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function handleClaim(missionId: string) {
    setClaimingId(missionId);
    setClaimError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("claim_mission", { p_mission_id: missionId });
      if (error) throw error;

      const result = data?.[0];
      setMissionStatus((prev) => ({
        ...prev,
        [missionId]: {
          ...prev[missionId],
          claimed: true,
          reward: result?.reward ?? prev[missionId]?.reward ?? 0
        }
      }));
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : "Failed to claim this mission.");
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]">
            <MdFlag className="text-xl" />
          </div>
          <h1 className="text-xl font-bold text-white md:text-2xl">
            {activeTaskClass ? activeTaskClass.name : "Your"} Mission
          </h1>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-white/60">
          Meet the goals, increase your earnings, then claim your reward. When
          completed, your daily goals will be automatically scored.
        </p>

        {claimError ? (
          <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {claimError}
          </p>
        ) : null}
      </div>

      <section id="daily-missions" className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white md:text-xl">
            Daily Missions
          </h2>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-white/50">
            <span className="h-1 w-6 rounded-full bg-orange-500" />
            4 objectives · same UTC day
          </div>
        </div>

        <MissionTimeline
          missions={DAILY_MISSIONS}
          lineColor="bg-orange-500/40"
          missionStatus={missionStatus}
          claimingId={claimingId}
          onClaim={handleClaim}
        />
      </section>

      <section id="weekly-missions" className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white md:text-xl">
            Weekly Missions
          </h2>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-white/50">
            <span className="h-1 w-6 rounded-full bg-violet-500" />
            2 active · rotates Monday UTC
          </div>
        </div>

        <MissionTimeline
          missions={WEEKLY_MISSIONS}
          lineColor="bg-violet-500/40"
          missionStatus={missionStatus}
          claimingId={claimingId}
          onClaim={handleClaim}
        />
      </section>

      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/50">
        <MdBolt className="shrink-0 text-sm text-[var(--brand-gold)]" />
        Rewards are credited automatically once a goal is completed and
        verified.
      </div>
    </div>
  );
}
