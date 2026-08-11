"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MdAccountBalanceWallet,
  MdArrowDownward,
  MdArrowUpward,
  MdBolt,
  MdCampaign,
  MdCardGiftcard,
  MdInbox,
  MdNotifications
} from "react-icons/md";
import { CURRENCY_SYMBOL } from "@/lib/currency";
import { formatRelativeTime } from "@/lib/time";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import type { AdminNotificationRow, TransactionRow } from "@/lib/database.types";

// Backend integration point:
// - Personal activity comes straight from public.transactions (credited by
//   daily tasks, check-ins, referrals, withdrawals, etc. - see the various
//   `insert into public.transactions (...)` calls in the SQL functions).
// - Announcements come from public.admin_notifications, a global broadcast
//   table an admin manages via SQL (see
//   supabase/migrations/0003_admin_notifications.sql). There's no admin
//   dashboard for this yet - an admin posts one with:
//     insert into public.admin_notifications (title, message) values ('Title', 'Message here.');
// - Both tables are added to the supabase_realtime publication, so new
//   activity/announcements appear instantly without a page refresh.

type FeedFilter = "all" | "activity" | "announcements";

type FeedItem =
  | { kind: "announcement"; id: string; created_at: string; title: string; message: string }
  | {
      kind: "activity";
      id: string;
      created_at: string;
      type: TransactionRow["type"];
      amount: number;
      status: TransactionRow["status"];
      description: string | null;
    };

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
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FeedFilter>("all");

  useEffect(() => {
    if (!userId) return;

    const uid = userId;
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const [{ data: transactions }, { data: announcements }] = await Promise.all([
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
          .limit(50)
      ]);

      if (cancelled) return;

      const merged: FeedItem[] = [
        ...(announcements ?? []).map((row) => ({
          kind: "announcement" as const,
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
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
          setItems((prev) => [
            { kind: "announcement", id: row.id, created_at: row.created_at, title: row.title, message: row.message },
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

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "activity") return items.filter((item) => item.kind === "activity");
    return items.filter((item) => item.kind === "announcement");
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
                      <span className="shrink-0 text-[11px] text-white/40">
                        {formatRelativeTime(new Date(item.created_at))}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-white/60">{item.message}</p>
                    <span className="mt-2 inline-flex rounded-full border border-[var(--brand-gold)]/20 bg-[var(--brand-gold)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-gold)]">
                      Announcement
                    </span>
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
                    <span className="shrink-0 text-[11px] text-white/40">
                      {formatRelativeTime(new Date(item.created_at))}
                    </span>
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
