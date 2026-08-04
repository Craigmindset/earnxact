import type { ReactNode } from "react";
import Link from "next/link";
import { MdBolt, MdFlag, MdStars } from "react-icons/md";
import { getCurrentTaskClass } from "@/components/dashboard/task-class-data";

type Tag = { label: string; tone: "brown" | "dark" };

type MissionCardData = {
  index: string;
  tags: Tag[];
  title: string;
  description: ReactNode;
  reward: number;
  actionLabel: string;
  actionHref?: string;
};

// Backend integration point:
// - Replace with the authenticated user's real daily mission progress
//   from your API (goals, completion state, claim eligibility).
const DAILY_MISSIONS: MissionCardData[] = [
  {
    index: "01",
    tags: [
      { label: "TIMEWALL", tone: "brown" },
      { label: "TODAY", tone: "dark" }
    ],
    title: "$2+ credited on TimeWall today",
    description: (
      <>
        Reach <strong className="font-semibold text-white">$2.00+</strong> in
        TimeWall credits before the UTC day rolls.
      </>
    ),
    reward: 20,
    actionLabel: "Open TimeWall"
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
        offer-wall sources (e.g. TimeWall, AdGem, CPX) the same UTC day.
      </>
    ),
    reward: 25,
    actionLabel: "Offerwall hub"
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

// Backend integration point:
// - Replace with the authenticated user's real weekly mission progress
//   from your API (goals, completion state, claim eligibility).
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
    title: "$15+ from walls this UTC week",
    description: (
      <>
        <strong className="font-semibold text-white">$15.00+</strong>{" "}
        combined from offer-wall credits Monday–Sunday UTC.
      </>
    ),
    reward: 100,
    actionLabel: "Offerwall hub"
  },
  {
    index: "03",
    tags: [
      { label: "TIMEWALL", tone: "brown" },
      { label: "MON–SUN UTC", tone: "dark" }
    ],
    title: "$5+ credited on TimeWall this week",
    description: (
      <>
        Reach <strong className="font-semibold text-white">$5.00+</strong> in
        TimeWall credits Monday–Sunday UTC.
      </>
    ),
    reward: 15,
    actionLabel: "Open TimeWall"
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

function MissionCard({ mission }: { mission: MissionCardData }) {
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
            <MdStars className="text-base" />+{mission.reward}
          </span>
          In progress - complete the goal to unlock a claim.
        </div>

        {mission.actionHref ? (
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
        )}
      </div>
    </div>
  );
}

function MissionTimeline({
  missions,
  lineColor
}: {
  missions: MissionCardData[];
  lineColor: string;
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
            <MissionCard mission={mission} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MissionsPage() {
  const activeTaskClass = getCurrentTaskClass();

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

        <MissionTimeline missions={DAILY_MISSIONS} lineColor="bg-orange-500/40" />
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

        <MissionTimeline missions={WEEKLY_MISSIONS} lineColor="bg-violet-500/40" />
      </section>

      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/50">
        <MdBolt className="shrink-0 text-sm text-[var(--brand-gold)]" />
        Rewards are credited automatically once a goal is completed and
        verified.
      </div>
    </div>
  );
}
