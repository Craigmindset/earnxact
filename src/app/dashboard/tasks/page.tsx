"use client";

import "react-day-picker/style.css";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { DayPicker } from "react-day-picker";
import {
  MdBolt,
  MdCalendarMonth,
  MdCameraAlt,
  MdCheck,
  MdClose,
  MdHourglassEmpty,
  MdLock,
  MdUploadFile
} from "react-icons/md";
import { CURRENCY_SYMBOL } from "@/lib/currency";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import type { DailyTaskTemplateRow, TaskSubmissionRow } from "@/lib/database.types";

// Backend integration point:
// - daily_task_templates holds the Mon-Fri task catalog (admin-managed via
//   SQL - edit title/description/reward directly, no deploy needed).
// - Submitting a task calls /api/tasks/submit, which uploads the proof
//   screenshot to Cloudinary then runs submit_daily_task() to atomically
//   record the submission and credit the reward - one submission per user
//   per template per Nigeria-calendar-day (enforced by a unique constraint).
// - The checkbox/calendar reflect public.task_submissions in realtime via
//   Supabase Realtime (postgres_changes), so a submission from any device
//   shows up immediately without a page refresh.

// Africa/Lagos (Nigeria) is UTC+1 year-round - it never observes DST, so a
// fixed offset is accurate (no timezone library needed).
const NIGERIA_OFFSET_MS = 60 * 60 * 1000;
const WEEKDAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

type NigeriaClock = {
  /** ISO weekday: 1 = Monday ... 7 = Sunday. */
  isoWeekday: number;
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  msUntilMidnight: number;
};

function getNigeriaClock(now: Date = new Date()): NigeriaClock {
  const nigeria = new Date(now.getTime() + NIGERIA_OFFSET_MS);
  const day = nigeria.getUTCDay();
  const hours = nigeria.getUTCHours();
  const minutes = nigeria.getUTCMinutes();
  const seconds = nigeria.getUTCSeconds();
  const msSinceMidnight =
    ((hours * 60 + minutes) * 60 + seconds) * 1000 + nigeria.getUTCMilliseconds();

  return {
    isoWeekday: day === 0 ? 7 : day,
    year: nigeria.getUTCFullYear(),
    month: nigeria.getUTCMonth(),
    day: nigeria.getUTCDate(),
    hours,
    minutes,
    seconds,
    msUntilMidnight: 24 * 60 * 60 * 1000 - msSinceMidnight
  };
}

function formatCountdown(ms: number) {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TasksPage() {
  const { userId, firstName, lastName, avatarUrl, uploadAvatar } = useUserProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [membershipPlanName, setMembershipPlanName] = useState<string | null>(null);
  const [membershipPlanId, setMembershipPlanId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<DailyTaskTemplateRow[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, TaskSubmissionRow>>({});
  const [allSubmissionDates, setAllSubmissionDates] = useState<string[]>([]);
  const [clock, setClock] = useState<NigeriaClock>(() => getNigeriaClock());

  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Set by the submissions-loading effect below so handleSubmit can force an
  // immediate refetch after a successful submit, rather than relying solely
  // on the Realtime subscription (which may lag or be misconfigured).
  const refreshSubmissionsRef = useRef<() => Promise<void>>(async () => {});

  // Tick every second - drives the current time display and the 24h
  // countdown on today's card.
  useEffect(() => {
    const timer = setInterval(() => setClock(getNigeriaClock()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load the task catalog for the user's *current* membership plan -
  // re-runs whenever membershipPlanId changes (e.g. right after an upgrade
  // is picked up by the user_profile realtime listener below), so the card
  // list always reflects the plan the user is on right now, never a stale
  // one from an earlier plan.
  useEffect(() => {
    if (!membershipPlanId) return;
    const planId = membershipPlanId;
    let cancelled = false;

    async function loadTemplates() {
      const supabase = createClient();
      const { data } = await supabase
        .from("daily_task_templates")
        .select("*")
        .eq("is_active", true)
        .eq("membership_plan_id", planId)
        .order("weekday", { ascending: true });

      if (!cancelled) {
        setTemplates(data ?? []);
      }
    }

    loadTemplates();
    return () => {
      cancelled = true;
    };
  }, [membershipPlanId]);

  // Load this user's membership plan + submission history once we know
  // who's signed in, then subscribe to realtime updates on task_submissions
  // so the checkbox/calendar flip instantly across any open tab/device.
  useEffect(() => {
    if (!userId) return;

    const uid = userId;
    let cancelled = false;
    const supabase = createClient();

    async function loadSubmissions() {
      const { data: subs } = await supabase.from("task_submissions").select("*").eq("user_id", uid);
      if (cancelled) return;

      const rows = subs ?? [];
      const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
      const todayMap: Record<string, TaskSubmissionRow> = {};
      for (const row of rows) {
        if (row.task_date === todayStr) {
          todayMap[row.template_id] = row;
        }
      }
      setSubmissions(todayMap);
      setAllSubmissionDates(rows.filter((row) => row.task_verified).map((row) => row.task_date));
    }

    async function loadUserData() {
      const [{ data: profile }] = await Promise.all([
        supabase
          .from("user_profile")
          .select("membership_plan_id, membership_plans(name)")
          .eq("user_id", uid)
          .maybeSingle(),
        loadSubmissions()
      ]);

      if (cancelled) return;

      const planRelation = (profile as { membership_plans?: { name: string } | { name: string }[] | null } | null)
        ?.membership_plans;
      const planName = Array.isArray(planRelation) ? planRelation[0]?.name : planRelation?.name;
      setMembershipPlanName(planName ?? null);
      setMembershipPlanId(profile?.membership_plan_id ?? null);
    }

    loadUserData();
    refreshSubmissionsRef.current = loadSubmissions;

    // Don't rely solely on the Realtime subscriptions below to eventually
    // deliver an update - also poll on a short interval as an "underlay"
    // safety net, so an admin's task_verified change (or a plan upgrade)
    // shows up within seconds even if a websocket event is missed/delayed.
    const pollTimer = setInterval(() => {
      refreshSubmissionsRef.current();
    }, 15000);

    const channel = supabase
      .channel(`task_submissions_${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "task_submissions", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as TaskSubmissionRow;
          const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
          if (row.task_date === todayStr) {
            setSubmissions((prev) => ({ ...prev, [row.template_id]: row }));
          }
          if (row.task_verified) {
            setAllSubmissionDates((prev) => [...prev, row.task_date]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "task_submissions", filter: `user_id=eq.${userId}` },
        (payload) => {
          // Fired when an admin verifies a submission (task_verified flips to
          // true and the reward gets credited) - flip the card green live.
          const row = payload.new as TaskSubmissionRow;
          const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
          if (row.task_date === todayStr) {
            setSubmissions((prev) => ({ ...prev, [row.template_id]: row }));
          }
          if (row.task_verified) {
            setAllSubmissionDates((prev) => (prev.includes(row.task_date) ? prev : [...prev, row.task_date]));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "user_profile", filter: `user_id=eq.${userId}` },
        () => {
          // Fired when the user's membership_plan_id changes (e.g. an
          // upgrade) - refetch (with the plan-name join) so the task list
          // swaps to the new plan's tasks live, no page refresh needed.
          loadUserData();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    setAvatarError(null);
    try {
      await uploadAvatar(file);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  }

  function handleFileSelect(templateId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingFiles((prev) => ({ ...prev, [templateId]: file }));
  }

  async function handleSubmit(templateId: string) {
    // Guards against double-submission from a fast double-click/tap - the
    // button is also disabled below while uploadingId is set, but this stops
    // a second call from ever starting even if that render hasn't landed yet.
    if (uploadingId) return;

    const file = pendingFiles[templateId];
    if (!file) {
      setSubmitError("Please choose a proof screenshot first.");
      return;
    }

    setUploadingId(templateId);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("templateId", templateId);

      const response = await fetch("/api/tasks/submit", { method: "POST", body: formData });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit task");
      }

      setPendingFiles((prev) => {
        const next = { ...prev };
        delete next[templateId];
        return next;
      });

      // Don't rely solely on the Realtime subscription to flip the card to
      // "completed" - refetch immediately so the button reliably disappears
      // and a duplicate submit can't be attempted.
      await refreshSubmissionsRef.current();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit task");
    } finally {
      setUploadingId(null);
    }
  }

  const completedDates = useMemo(
    () => allSubmissionDates.map((d) => new Date(`${d}T00:00:00`)),
    [allSubmissionDates]
  );
  const todayDate = useMemo(
    () => new Date(clock.year, clock.month, clock.day),
    [clock.year, clock.month, clock.day]
  );

  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "there";
  const initial = firstName?.[0]?.toUpperCase() ?? "U";
  const isWeekend = clock.isoWeekday > 5;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Hero banner - half the height of the /dashboard/earnpass hero. */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10">
        <Image src="/images/earnpass-bg.jpg" alt="" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />

        <div className="relative flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:py-7">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              aria-label="Change profile photo"
              className="group relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--brand-gold)]/50 bg-[var(--brand-gold)]/20 text-lg font-semibold text-[var(--brand-gold)] transition disabled:opacity-60"
            >
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Profile" width={56} height={56} className="h-full w-full object-cover" />
              ) : (
                initial
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                <MdCameraAlt className="text-lg text-white" />
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />

            <div>
              <h1 className="text-lg font-semibold text-white sm:text-xl">{fullName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-2.5 py-0.5 text-xs font-semibold text-[var(--brand-gold)]">
                  {membershipPlanName ?? "Free"} plan
                </span>
                <span className="text-xs text-white/50">
                  {WEEKDAY_LABELS[clock.isoWeekday - 1] ?? "Weekend"}, {MONTH_LABELS[clock.month]} {clock.day} {clock.year}
                </span>
              </div>
              {avatarError && <p className="mt-1 text-xs text-red-400">{avatarError}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setCalendarOpen(true)}
              aria-label="View task calendar"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <MdCalendarMonth className="text-base" />
            </button>

            <Link
              href="/dashboard/earnpass"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--brand-smoky-white)] px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
            >
              <MdBolt className="text-base" />
              Upgrade
            </Link>
          </div>
        </div>
      </div>

      {calendarOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setCalendarOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[var(--brand-card-1)] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Your task calendar</h2>
              <button
                type="button"
                onClick={() => setCalendarOpen(false)}
                aria-label="Close calendar"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <MdClose className="text-lg" />
              </button>
            </div>
            <p className="mt-1 text-sm text-white/50">
              Green days mean a task was verified and paid. Only Monday - Friday have active tasks.
            </p>

            <div
              className="tasks-calendar mt-4 flex justify-center"
              style={
                {
                  "--rdp-accent-color": "var(--brand-gold)",
                  "--rdp-today-color": "var(--brand-gold)"
                } as React.CSSProperties
              }
            >
              <DayPicker
                defaultMonth={todayDate}
                modifiers={{ completed: completedDates }}
                modifiersStyles={{
                  completed: {
                    backgroundColor: "rgba(34,197,94,0.25)",
                    color: "#22c55e",
                    borderRadius: 9999,
                    fontWeight: 700
                  }
                }}
                disabled={{ dayOfWeek: [0, 6] }}
              />
            </div>
          </div>
        </div>
      )}

      {isWeekend && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-sm text-white/60">
          No tasks today - daily tasks run Monday to Friday. Come back on Monday!
        </div>
      )}

      {/* Task cards - one per weekday, only today's card is active. */}
      <div className="grid gap-4 sm:grid-cols-2">
        {templates.map((template) => {
          const isToday = template.weekday === clock.isoWeekday;
          const submission = submissions[template.id];
          const hasSubmission = Boolean(submission);
          const verified = Boolean(submission?.task_verified);
          const pending = hasSubmission && !verified;
          const expired = isToday && !hasSubmission && clock.msUntilMidnight <= 0;
          const dayLabel = WEEKDAY_LABELS[template.weekday - 1];

          return (
            <div
              key={template.id}
              className={`rounded-2xl border p-5 transition ${
                isToday
                  ? "border-[var(--brand-gold)]/30 bg-white/5"
                  : "border-white/10 bg-black/20 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {dayLabel}
                    {isToday && `, ${MONTH_LABELS[clock.month]} ${clock.day} ${clock.year}`}
                  </div>
                  {isToday && (
                    <div className="mt-1 text-xs text-white/50">
                      {String(clock.hours).padStart(2, "0")}:{String(clock.minutes).padStart(2, "0")}:
                      {String(clock.seconds).padStart(2, "0")} GMT+1
                    </div>
                  )}
                </div>

                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-2 ${
                    verified
                      ? "border-green-500 bg-green-500/20 text-green-500"
                      : pending
                        ? "border-amber-500 bg-amber-500/20 text-amber-500"
                        : expired
                          ? "border-red-500 bg-red-500/20 text-red-500"
                          : "border-white/20 text-white/30"
                  }`}
                >
                  {verified ? (
                    <MdCheck className="text-lg" />
                  ) : pending ? (
                    <MdHourglassEmpty className="text-base" />
                  ) : expired ? (
                    <MdClose className="text-lg" />
                  ) : null}
                </div>
              </div>

              {isToday ? (
                <>
                  <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-white/40">
                    Time remaining
                  </div>
                  <div className="mt-1 font-mono text-2xl font-semibold text-[var(--brand-gold)]">
                    {formatCountdown(clock.msUntilMidnight)}
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-white/70">{template.description}</p>
                  <div className="mt-2 text-sm font-semibold text-[var(--brand-gold)]">
                    Reward: {CURRENCY_SYMBOL}
                    {Number(template.reward).toFixed(2)}
                  </div>

                  {verified ? (
                    <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs font-medium text-green-400">
                      Task completed - reward credited.
                    </div>
                  ) : pending ? (
                    <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-400">
                      Pending review - your reward is credited once this submission is verified.
                    </div>
                  ) : expired ? (
                    <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400">
                      Time&rsquo;s up for today&rsquo;s task.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-white/20 px-3 py-2.5 text-sm text-white/60 transition hover:border-[var(--brand-gold)]/40 hover:text-white">
                        <MdUploadFile className="shrink-0 text-base" />
                        {pendingFiles[template.id]?.name ?? "Upload proof screenshot"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileSelect(template.id, e)}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => handleSubmit(template.id)}
                        disabled={uploadingId === template.id}
                        className="w-full rounded-lg bg-[var(--brand-gold)] px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {uploadingId === template.id ? "Submitting..." : "Submit"}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-4 flex items-center gap-2 text-sm text-white/40">
                  <MdLock className="shrink-0 text-base" />
                  Available on {dayLabel}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {submitError && (
        <p className="text-center text-sm text-red-400">{submitError}</p>
      )}
    </div>
  );
}
