"use client";

import { useEffect, useState } from "react";
import {
  MdBarChart,
  MdEmojiEvents,
  MdInfoOutline,
  MdLock,
  MdMilitaryTech
} from "react-icons/md";
import { TASK_CLASSES, getCurrentTaskClass } from "@/components/dashboard/task-class-data";
import { CURRENCY_SYMBOL } from "@/lib/currency";

type PodiumEntry = {
  rank: 1 | 2 | 3;
  prize: number;
  icon: typeof MdEmojiEvents;
  iconColor: string;
};

const PODIUM: PodiumEntry[] = [
  { rank: 1, prize: 50000, icon: MdEmojiEvents, iconColor: "text-[var(--brand-gold)]" },
  { rank: 2, prize: 25000, icon: MdMilitaryTech, iconColor: "text-slate-300" },
  { rank: 3, prize: 10000, icon: MdMilitaryTech, iconColor: "text-amber-700" }
];

// Backend integration point:
// - Replace with the real weekly leaderboard rankings from the API.
// `taskClassId` should match one of the `TASK_CLASSES` ids in
// task-class-data.ts so the user's full category shows on the board.
const RANKINGS = [
  { rank: 1, username: "cash_king", earnings: 128400, taskClassId: "senior-executive" },
  { rank: 2, username: "grinder_jane", earnings: 96750, taskClassId: "executive" },
  { rank: 3, username: "taskmaster99", earnings: 74200, taskClassId: "mid-executive" },
  { rank: 4, username: "dailygrind", earnings: 58100, taskClassId: "junior-manager" },
  { rank: 5, username: "earnwithme", earnings: 47900, taskClassId: "superior-class" },
  { rank: 6, username: "sidehustlepro", earnings: 39500, taskClassId: "superior-class" },
  { rank: 7, username: "clickqueen", earnings: 31200, taskClassId: "upscale-class" },
  { rank: 8, username: "topgrosser", earnings: 24600, taskClassId: "upscale-class" },
  { rank: 9, username: "steadyearns", earnings: 18300, taskClassId: "team-class" },
  { rank: 10, username: "quickcash01", earnings: 12750, taskClassId: "team-class" }
];

function getCategoryLabel(taskClassId: string): string {
  return TASK_CLASSES.find((taskClass) => taskClass.id === taskClassId)?.name ?? "Unranked";
}

function getMillisecondsUntilNextMondayUtc(): number {
  const now = new Date();
  const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7;
  const nextMonday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday)
  );
  return nextMonday.getTime() - now.getTime();
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (value: number) => value.toString().padStart(2, "0");

  return days > 0
    ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function RankBadge({ rank }: { rank: number }) {
  const podiumEntry = PODIUM.find((entry) => entry.rank === rank);

  if (podiumEntry) {
    const Icon = podiumEntry.icon;
    return <Icon className={`text-xl ${podiumEntry.iconColor}`} />;
  }

  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/20 text-xs font-semibold text-white/60">
      {rank}
    </span>
  );
}

export default function LeaderboardPage() {
  const activeTaskClass = getCurrentTaskClass();
  const [countdown, setCountdown] = useState(getMillisecondsUntilNextMondayUtc());

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getMillisecondsUntilNextMondayUtc());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white md:text-3xl">
          Weekly Leaderboard
        </h1>
        <p className="mt-1 text-sm text-white/50">
          See who earned the most cash this week. Resets every Monday at
          00:00 UTC.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]">
              <MdBarChart className="text-xl" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                Earned this week
              </div>
              <div className="text-xs text-white/50">
                Top 10 • Weekly reset (UTC)
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start rounded-xl border border-white/10 bg-black/20 px-4 py-2 sm:items-end">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-white/50">
              Ends in
            </span>
            <span className="font-mono text-lg font-semibold text-[var(--brand-gold)]">
              {formatCountdown(countdown)}
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
          {PODIUM.map((entry) => {
            const Icon = entry.icon;
            return (
              <div
                key={entry.rank}
                className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-black/20 p-4 text-center"
              >
                <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold text-white/70">
                  #{entry.rank}
                </span>
                <Icon className={`text-3xl ${entry.iconColor}`} />
                <div className="text-sm font-semibold text-white sm:text-base">
                  {CURRENCY_SYMBOL}
                  {entry.prize.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10">
          {RANKINGS.map((entry) => (
            <div
              key={entry.rank}
              className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/5"
            >
              <div className="flex w-8 shrink-0 items-center justify-center">
                <RankBadge rank={entry.rank} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-white/80">
                  {entry.username}
                </span>
                <span className="mt-0.5 w-fit truncate rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-medium text-white/50">
                  {getCategoryLabel(entry.taskClassId)}
                </span>
              </div>
              {entry.rank <= 3 && <MdLock className="text-sm text-white/30" />}
              <span className="shrink-0 text-sm font-semibold text-[var(--brand-gold)]">
                {CURRENCY_SYMBOL}
                {entry.earnings.toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-xl border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-4 py-3">
          <div className="flex w-8 shrink-0 items-center justify-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/20 text-xs font-semibold text-white/60">
              14
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-center gap-2 truncate text-sm font-medium text-white/80">
              you
              <span className="rounded-full bg-[var(--brand-gold)] px-2 py-0.5 text-[10px] font-semibold text-black">
                you
              </span>
            </span>
            <span className="mt-0.5 w-fit truncate rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-medium text-white/50">
              {activeTaskClass ? activeTaskClass.name : "No active category"}
            </span>
          </div>
          <span className="shrink-0 text-sm font-semibold text-[var(--brand-gold)]">
            {CURRENCY_SYMBOL}
            {(4200).toLocaleString()}
          </span>
        </div>

        <div className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-white/50">
          <MdInfoOutline className="mt-0.5 shrink-0 text-sm" />
          Totals use this week&apos;s UTC game earnings. Top 3 are paid after
          the weekly UTC reset when they finish in the top 3 and earn at
          least {CURRENCY_SYMBOL}10,000.
        </div>
      </div>
    </div>
  );
}
