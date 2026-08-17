// Best-practice relative time formatting for activity feeds (e.g. "Just now",
// "5m ago", "Yesterday"). Keep this as the single source of truth so any
// feed/timeline across the app formats timestamps consistently.
export function formatRelativeTime(timestamp: number | Date): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

export function getNigeriaDateString(date: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(date);
}

// Withdrawals are only allowed on Fridays (Africa/Lagos calendar day - see
// create_withdrawal_request() in supabase/migrations/0008_withdrawal_limits.sql).
// This computes, purely from a timestamp, whether it's currently Friday in
// Lagos and the exact millisecond the withdrawal window next opens (if it's
// not Friday yet) or closes (if it's already Friday) - used to power the
// "next withdrawal date" countdown on /dashboard/wallet.
// Africa/Lagos has no DST and is a fixed UTC+1 year-round.
const LAGOS_OFFSET_MS = 60 * 60 * 1000;

export function getNextWithdrawalWindow(now: Date = new Date()): {
  isFridayToday: boolean;
  targetTimestampMs: number;
} {
  const lagosNow = new Date(now.getTime() + LAGOS_OFFSET_MS);
  const lagosDay = lagosNow.getUTCDay(); // 0 = Sun ... 5 = Fri ... 6 = Sat
  const isFridayToday = lagosDay === 5;

  // Midnight "today" in Lagos, expressed back as a real UTC ms timestamp.
  const lagosMidnightTodayUtcMs =
    Date.UTC(lagosNow.getUTCFullYear(), lagosNow.getUTCMonth(), lagosNow.getUTCDate(), 0, 0, 0) -
    LAGOS_OFFSET_MS;

  // If it's Friday, count down to when the window closes (next day,
  // Saturday 00:00 Lagos). Otherwise count down to when it next opens
  // (the coming Friday 00:00 Lagos).
  const daysToAdd = isFridayToday ? 1 : (5 - lagosDay + 7) % 7;
  const targetTimestampMs = lagosMidnightTodayUtcMs + daysToAdd * 24 * 60 * 60 * 1000;

  return { isFridayToday, targetTimestampMs };
}
