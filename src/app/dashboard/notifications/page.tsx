"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MdAccountBalanceWallet,
  MdArrowDownward,
  MdArrowUpward,
  MdBolt,
  MdCampaign,
  MdCardGiftcard,
  MdDeleteOutline,
  MdInbox,
  MdNotifications,
  MdNotificationsActive,
  MdVolumeOff,
  MdVolumeUp
} from "react-icons/md";
import { CURRENCY_SYMBOL } from "@/lib/currency";
import { formatRelativeTime } from "@/lib/time";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { isNotificationSoundMuted, playNotificationChime, setNotificationSoundMuted } from "@/lib/sound";
import type { AdminNotificationRow, TransactionRow, UserNotificationRow } from "@/lib/database.types";

// Backend integration point:
// - Personal activity comes straight from public.transactions (credited by
//   daily tasks, check-ins, referrals, withdrawals, etc. - see the various
//   `insert into public.transactions (...)` calls in the SQL functions).
// - Announcements come from public.admin_notifications, a global broadcast
//   table an admin manages via SQL (see
//   supabase/migrations/0003_admin_notifications.sql). There's no admin
//   dashboard for this yet - an admin posts one with:
//     insert into public.admin_notifications (title, message) values ('Title', 'Message here.');
// - Personal reminders (e.g. "Notify me" on /dashboard/wallet) come from
//   public.user_notifications (see supabase/migrations/0010_notifications_and_reminders.sql).
// - All three tables are added to the supabase_realtime publication, so new
//   activity/announcements/reminders appear instantly without a page refresh.
// - "Delete"/"Clear" never removes the underlying transactions/admin_notifications
//   row (financial/shared records must keep an audit trail) - it just adds a
//   row to public.notification_dismissals so that item is hidden for this
//   user going forward.

type FeedFilter = "all" | "activity" | "announcements";

type FeedItem =
  | { kind: "announcement"; id: string; created_at: string; title: string; message: string }
  | { kind: "personal"; id: string; created_at: string; title: string; message: string }
  | {
      kind: "activity";
      id: string;
      created_at: string;
      type: TransactionRow["type"];
      amount: number;
      status: TransactionRow["status"];
      description: string | null;
    };

function itemKey(item: FeedItem): string {
  return `${item.kind}:${item.id}`;
}

const TYPE_META: Record<
  TransactionRow["type"],
  { label: string; icon: typeof MdArrowDownward; iconClass: string; badgeClass: string }
> = {
  credit: {
    label: "Credit",
    icon: MdArrowDownward,
    iconClass: "bg-emerald-500/15 text-emerald-400",
    badgeClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
  },
  bonus: {
    label: "Bonus",
    icon: MdCardGiftcard,
    iconClass: "bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]",
    badgeClass: "border-[var(--brand-gold)]/20 bg-[var(--brand-gold)]/10 text-[var(--brand-gold)]"
  },
  debit: {
    label: "Debit",
    icon: MdArrowUpward,
    iconClass: "bg-rose-500/15 text-rose-400",
    badgeClass: "border-rose-500/20 bg-rose-500/10 text-rose-400"
  },
  withdrawal: {
    label: "Withdrawal",
    icon: MdAccountBalanceWallet,
    iconClass: "bg-sky-500/15 text-sky-400",
    badgeClass: "border-sky-500/20 bg-sky-500/10 text-sky-400"
  }
};

const STATUS_BADGE: Record<TransactionRow["status"], string> = {
  completed: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  pending: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  failed: "border-rose-500/20 bg-rose-500/10 text-rose-400"
};

const FILTERS: { id: FeedFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "activity", label: "Activity" },
  { id: "announcements", label: "Announcements" }
];

export default function NotificationsPage() {
  const { userId } = useUserProfile();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [soundMuted, setSoundMuted] = useState(false);

  useEffect(() => {
    setSoundMuted(isNotificationSoundMuted());
  }, []);

  function toggleSound() {
    const next = !soundMuted;
    setSoundMuted(next);
    setNotificationSoundMuted(next);
  }

  useEffect(() => {
    if (!userId) return;

    const uid = userId;
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      // Fires any "notify me" reminder that's due for this user (see
      // /dashboard/wallet) before loading the feed, so it shows up immediately.
      await supabase.rpc("claim_due_withdrawal_reminders");

      const [{ data: transactions }, { data: announcements }, { data: personal }, { data: dismissals }] =
        await Promise.all([
          supabase
            .from("transactions")
            .select("id, type, amount, status, description, reference, created_at")
            .eq("user_id", uid)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("admin_notifications")
            .select("id, title, message, created_at")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("user_notifications")
            .select("id, title, message, created_at")
            .order("created_at", { ascending: false })
            .limit(50),
          supabase.from("notification_dismissals").select("item_key")
        ]);

      if (cancelled) return;

      const dismissedSet = new Set((dismissals ?? []).map((row) => row.item_key));

      const merged: FeedItem[] = [
        ...(announcements ?? []).map((row) => ({
          kind: "announcement" as const,
          id: row.id,
          created_at: row.created_at,
          title: row.title,
          message: row.message
        })),
        ...(personal ?? []).map((row) => ({
          kind: "personal" as const,
          id: row.id,
          created_at: row.created_at,
          title: row.title,
          message: row.message
        })),
        ...(transactions ?? []).map((row) => ({
          kind: "activity" as const,
          id: row.id,
          created_at: row.created_at,
          type: row.type,
          amount: Number(row.amount),
          status: row.status,
          description: row.description
        }))
      ]
        .filter((item) => !dismissedSet.has(itemKey(item)))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setDismissedKeys(dismissedSet);
      setItems(merged);
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel(`notifications_${uid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: `user_id=eq.${uid}` },
        (payload) => {
          const row = payload.new as TransactionRow;
          playNotificationChime();
          setItems((prev) => [
            {
              kind: "activity",
              id: row.id,
              created_at: row.created_at,
              type: row.type,
              amount: Number(row.amount),
              status: row.status,
              description: row.description
            },
            ...prev
          ]);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_notifications" },
        (payload) => {
          const row = payload.new as AdminNotificationRow;
          if (!row.is_active) return;
          playNotificationChime();
          setItems((prev) => [
            { kind: "announcement", id: row.id, created_at: row.created_at, title: row.title, message: row.message },
            ...prev
          ]);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "user_notifications", filter: `user_id=eq.${uid}` },
        (payload) => {
          const row = payload.new as UserNotificationRow;
          playNotificationChime();
          setItems((prev) => [
            { kind: "personal", id: row.id, created_at: row.created_at, title: row.title, message: row.message },
            ...prev
          ]);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function dismissItem(item: FeedItem) {
    if (!userId) return;
    const key = itemKey(item);

    setItems((prev) => prev.filter((existing) => itemKey(existing) !== key));
    setDismissedKeys((prev) => new Set(prev).add(key));

    const supabase = createClient();
    await supabase.from("notification_dismissals").insert({ user_id: userId, item_key: key });
  }

  async function clearVisible() {
    if (!userId || filteredItems.length === 0) return;

    const toDismiss = filteredItems.map((item) => ({ user_id: userId, item_key: itemKey(item) }));
    const dismissedNow = new Set(toDismiss.map((row) => row.item_key));

    setItems((prev) => prev.filter((item) => !dismissedNow.has(itemKey(item))));
    setDismissedKeys((prev) => {
      const next = new Set(prev);
      dismissedNow.forEach((key) => next.add(key));
      return next;
    });

    const supabase = createClient();
    await supabase.from("notification_dismissals").insert(toDismiss);
  }

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "activity") return items.filter((item) => item.kind === "activity");
    return items.filter((item) => item.kind === "announcement" || item.kind === "personal");
  }, [items, filter]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-3 py-1 text-xs font-semibold text-[var(--brand-gold)]">
          <MdBolt className="text-sm" />
          Stay updated
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]">
            <MdNotifications className="text-xl" />
          </div>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">Notifications</h1>
        </div>

        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60">
          Your completed activity — task rewards, bonuses, withdrawals — plus
          announcements from the EarnXact team, all in one place.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                filter === option.id
                  ? "border-[var(--brand-gold)] bg-[var(--brand-gold)]/10 text-[var(--brand-gold)]"
                  : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundMuted ? "Unmute notification sound" : "Mute notification sound"}
            title={soundMuted ? "Unmute notification sound" : "Mute notification sound"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            {soundMuted ? <MdVolumeOff className="text-base" /> : <MdVolumeUp className="text-base" />}
          </button>

          {filteredItems.length > 0 && (
            <button
              type="button"
              onClick={clearVisible}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 py-16 text-center">
          <MdInbox className="text-3xl text-white/30" />
          <p className="text-sm text-white/50">Nothing here yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            if (item.kind === "announcement") {
              return (
                <div
                  key={`announcement-${item.id}`}
                  className="flex gap-4 rounded-2xl border border-[var(--brand-gold)]/20 bg-[var(--brand-gold)]/5 p-4"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]">
                    <MdCampaign className="text-xl" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-semibold text-white">{item.title}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-[11px] text-white/40">
                          {formatRelativeTime(new Date(item.created_at))}
                        </span>
                        <button
                          type="button"
                          onClick={() => dismissItem(item)}
                          aria-label="Delete notification"
                          className="text-white/30 transition hover:text-rose-400"
                        >
                          <MdDeleteOutline className="text-base" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-white/60">{item.message}</p>
                    <span className="mt-2 inline-flex rounded-full border border-[var(--brand-gold)]/20 bg-[var(--brand-gold)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-gold)]">
                      Announcement
                    </span>
                  </div>
                </div>
              );
            }

            if (item.kind === "personal") {
              return (
                <div
                  key={`personal-${item.id}`}
                  className="flex gap-4 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
                    <MdNotificationsActive className="text-xl" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-semibold text-white">{item.title}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-[11px] text-white/40">
                          {formatRelativeTime(new Date(item.created_at))}
                        </span>
                        <button
                          type="button"
                          onClick={() => dismissItem(item)}
                          aria-label="Delete notification"
                          className="text-white/30 transition hover:text-rose-400"
                        >
                          <MdDeleteOutline className="text-base" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-white/60">{item.message}</p>
                  </div>
                </div>
              );
            }

            const meta = TYPE_META[item.type];
            const Icon = meta.icon;
            const isNegative = item.type === "debit" || item.type === "withdrawal";

            return (
              <div
                key={`activity-${item.id}`}
                className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${meta.iconClass}`}>
                  <Icon className="text-xl" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold text-white">
                      {item.description || meta.label}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[11px] text-white/40">
                        {formatRelativeTime(new Date(item.created_at))}
                      </span>
                      <button
                        type="button"
                        onClick={() => dismissItem(item)}
                        aria-label="Delete notification"
                        className="text-white/30 transition hover:text-rose-400"
                      >
                        <MdDeleteOutline className="text-base" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`text-sm font-semibold ${isNegative ? "text-rose-400" : "text-emerald-400"}`}>
                      {isNegative ? "-" : "+"}
                      {CURRENCY_SYMBOL}
                      {item.amount.toLocaleString()}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_BADGE[item.status]}`}>
                      {item.status}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.badgeClass}`}>
                      {meta.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
