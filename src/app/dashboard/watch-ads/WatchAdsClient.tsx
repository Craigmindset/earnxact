// "use client";

// import { useState, useEffect, useRef, useCallback } from "react";
// import Link from "next/link";
// import {
//   MdOndemandVideo,
//   MdPlayArrow,
//   MdCheck,
//   MdLock,
//   MdTimer,
//   MdCheckCircle,
//   MdInfo,
//   MdCardMembership,
// } from "react-icons/md";
// import { claimAdReward } from "./actions";
// import { formatCurrency } from "@/lib/currency";
// import { TASK_CLASSES } from "@/components/dashboard/task-class-data";
// import type { AdRow } from "@/lib/database.types";

// const CLASS_DAILY_LIMITS: Record<string, number> = {
//   "task-class-1":    3,
//   "task-class-2":    5,
//   "upscale-class":   7,
//   "superior-class":  10,
//   "junior-manager":  12,
//   "mid-executive":   15,
//   "executive":       18,
//   "senior-executive": 20,
// };

// const CATEGORY_COLORS: Record<string, string> = {
//   Finance:   "bg-blue-500/15 text-blue-400",
//   Education: "bg-violet-500/15 text-violet-400",
//   Shopping:  "bg-pink-500/15 text-pink-400",
//   Lifestyle: "bg-emerald-500/15 text-emerald-400",
//   Energy:    "bg-amber-500/15 text-amber-400",
//   General:   "bg-zinc-500/15 text-zinc-400",
// };

// const CATEGORY_GRADIENTS: Record<string, string> = {
//   Finance:   "from-blue-600/30 to-blue-950/60",
//   Education: "from-violet-600/30 to-violet-950/60",
//   Shopping:  "from-pink-600/30 to-pink-950/60",
//   Lifestyle: "from-emerald-600/30 to-emerald-950/60",
//   Energy:    "from-amber-600/30 to-amber-950/60",
//   General:   "from-zinc-600/30 to-zinc-950/60",
// };

// interface ToastItem {
//   id: number;
//   type: "cash" | "points";
//   amount: number;
// }

// interface Props {
//   ads: AdRow[];
//   viewedAdIds: string[];
//   taskClassId: string | null;
//   todayEarned: number;
//   todayPoints: number;
// }

// // ── Watch Modal ────────────────────────────────────────────────
// function WatchModal({
//   ad,
//   onDone,
// }: {
//   ad: AdRow;
//   onDone: (adId: string) => void;
// }) {
//   const [countdown, setCountdown] = useState(ad.duration_seconds);
//   const doneCalledRef = useRef(false);
//   const onDoneRef = useRef(onDone);
//   onDoneRef.current = onDone;

//   useEffect(() => {
//     if (countdown <= 0) {
//       if (!doneCalledRef.current) {
//         doneCalledRef.current = true;
//         onDoneRef.current(ad.id);
//       }
//       return;
//     }
//     const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
//     return () => clearTimeout(timer);
//   }, [countdown, ad.id]);

//   const progress =
//     ((ad.duration_seconds - countdown) / ad.duration_seconds) * 100;
//   const gradient =
//     CATEGORY_GRADIENTS[ad.category] ?? CATEGORY_GRADIENTS.General;
//   const catColor = CATEGORY_COLORS[ad.category] ?? CATEGORY_COLORS.General;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
//       <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl">
//         {/* Video placeholder / SDK injection point */}
//         <div
//           className={`relative flex h-44 flex-col items-center justify-center bg-gradient-to-br ${gradient}`}
//         >
//           <div id="ad-container" className="absolute inset-0 flex items-center justify-center">
//             {/* Ad provider SDK renders here — replace placeholder with real VAST/rewarded video player */}
//             <div className="flex flex-col items-center gap-2 text-center">
//               <MdOndemandVideo className="animate-pulse text-5xl text-white/25" />
//               <p className="px-6 text-sm font-medium text-white/50">{ad.title}</p>
//             </div>
//           </div>

//           <span
//             className={`absolute left-3 top-3 z-10 rounded-full px-2 py-0.5 text-[10px] font-semibold ${catColor}`}
//           >
//             {ad.category}
//           </span>
//           <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 font-mono text-xs font-bold text-white">
//             <MdTimer className="text-sm" />
//             {countdown}s
//           </div>
//         </div>

//         {/* Progress bar */}
//         <div className="h-1 bg-white/10">
//           <div
//             className="h-full bg-[var(--brand-gold)] transition-all duration-1000 ease-linear"
//             style={{ width: `${progress}%` }}
//           />
//         </div>

//         <div className="space-y-4 p-5">
//           <div>
//             <h3 className="text-base font-semibold text-white">{ad.title}</h3>
//             <p className="mt-0.5 text-sm text-white/50">
//               Watch the full ad to earn your reward
//             </p>
//           </div>

//           <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
//             <span className="text-sm text-white/60">Your reward</span>
//             <span
//               className={`text-base font-bold ${
//                 ad.reward_type === "cash"
//                   ? "text-[var(--brand-gold)]"
//                   : "text-violet-400"
//               }`}
//             >
//               {ad.reward_type === "cash"
//                 ? `+${formatCurrency(ad.reward_amount)}`
//                 : `+${Math.round(ad.reward_amount)} pts`}
//             </span>
//           </div>

//           <p className="text-center text-[11px] text-white/25">
//             Do not close this window. Reward will be credited automatically.
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── Main Component ─────────────────────────────────────────────
// export default function WatchAdsClient({
//   ads,
//   viewedAdIds,
//   taskClassId,
//   todayEarned,
//   todayPoints,
// }: Props) {
//   const dailyLimit = taskClassId ? (CLASS_DAILY_LIMITS[taskClassId] ?? 0) : 0;
//   const taskClass = TASK_CLASSES.find((c) => c.id === taskClassId) ?? null;

//   const [watchedIds, setWatchedIds] = useState<Set<string>>(
//     new Set(viewedAdIds)
//   );
//   const [watchingAd, setWatchingAd] = useState<AdRow | null>(null);
//   const [isClaiming, setIsClaiming] = useState(false);
//   const [earnedToday, setEarnedToday] = useState(todayEarned);
//   const [pointsToday, setPointsToday] = useState(todayPoints);
//   const [toasts, setToasts] = useState<ToastItem[]>([]);
//   const [claimError, setClaimError] = useState<string | null>(null);
//   const toastCounter = useRef(0);

//   const adsWatchedToday = watchedIds.size;
//   const limitReached = dailyLimit > 0 && adsWatchedToday >= dailyLimit;

//   const handleWatchComplete = useCallback(
//     async (adId: string) => {
//       const ad = ads.find((a) => a.id === adId);
//       if (!ad) {
//         setWatchingAd(null);
//         return;
//       }

//       setIsClaiming(true);
//       setClaimError(null);

//       const result = await claimAdReward(adId);
//       setIsClaiming(false);
//       setWatchingAd(null);

//       if (result.success) {
//         setWatchedIds((prev) => new Set([...prev, adId]));
//         if (ad.reward_type === "cash") {
//           setEarnedToday((prev) => prev + ad.reward_amount);
//         } else {
//           setPointsToday((prev) => prev + Math.round(ad.reward_amount));
//         }
//         toastCounter.current += 1;
//         const id = toastCounter.current;
//         setToasts((prev) => [
//           ...prev,
//           { id, type: ad.reward_type, amount: ad.reward_amount },
//         ]);
//         setTimeout(
//           () => setToasts((prev) => prev.filter((t) => t.id !== id)),
//           4000
//         );
//       } else {
//         setClaimError(
//           result.error === "already_watched"
//             ? "You already watched this ad today."
//             : result.error === "daily_limit_reached"
//               ? "Daily ad limit reached for your class."
//               : result.error === "no_class_registered"
//                 ? "You need an EarnPass class to watch ads."
//                 : "Failed to credit reward. Please try again."
//         );
//       }
//     },
//     [ads]
//   );

//   function startWatching(ad: AdRow) {
//     if (watchedIds.has(ad.id) || limitReached || watchingAd !== null) return;
//     setClaimError(null);
//     setWatchingAd(ad);
//   }

//   return (
//     <>
//       {watchingAd && !isClaiming && (
//         <WatchModal ad={watchingAd} onDone={handleWatchComplete} />
//       )}

//       {isClaiming && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
//           <div className="flex flex-col items-center gap-3">
//             <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[var(--brand-gold)]" />
//             <p className="text-sm text-white/60">Crediting your reward…</p>
//           </div>
//         </div>
//       )}

//       {/* Toast notifications */}
//       <div className="fixed right-4 top-20 z-40 flex flex-col gap-2">
//         {toasts.map((toast) => (
//           <div
//             key={toast.id}
//             className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-zinc-900 px-4 py-3 shadow-xl"
//           >
//             <MdCheckCircle className="shrink-0 text-xl text-green-400" />
//             <span className="text-sm font-medium text-white">
//               {toast.type === "cash"
//                 ? `+${formatCurrency(toast.amount)} credited to wallet!`
//                 : `+${Math.round(toast.amount)} points earned!`}
//             </span>
//           </div>
//         ))}
//       </div>

//       <div className="mx-auto max-w-6xl space-y-6">
//         {/* Header */}
//         <div>
//           <h1 className="text-2xl font-bold text-white md:text-3xl">
//             Watch Ads
//           </h1>
//           <p className="mt-1 text-sm text-white/50">
//             Watch short video ads and earn cash or points instantly.
//           </p>
//         </div>

//         {/* No class registered — prompt to get EarnPass */}
//         {!taskClassId && (
//           <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 p-6">
//             <div className="absolute inset-y-0 left-0 w-1 bg-[var(--brand-gold)]" />
//             <div className="flex items-start gap-4">
//               <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-gold)]/15 text-[var(--brand-gold)] shadow-[0_0_20px_rgba(244,163,0,0.25)]">
//                 <MdCardMembership className="text-2xl" />
//               </div>
//               <div>
//                 <h2 className="text-base font-bold text-white">
//                   You need an EarnPass class to watch ads
//                 </h2>
//                 <p className="mt-1 text-sm text-white/50">
//                   Register for a task class to unlock daily ad watch slots and
//                   start earning cash and points.
//                 </p>
//                 <Link
//                   href="/dashboard/earnpass"
//                   className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
//                 >
//                   <MdCardMembership className="text-base" />
//                   Get EarnPass
//                 </Link>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Stats — only shown when user has a class */}
//         {taskClassId && (
//           <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
//             {/* Daily progress */}
//             <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
//               <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
//                 Daily Progress
//               </p>
//               <p className="mt-1 text-2xl font-bold text-white">
//                 {adsWatchedToday}
//                 <span className="text-base font-normal text-white/40">
//                   /{dailyLimit}
//                 </span>
//               </p>
//               <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
//                 <div
//                   className="h-full rounded-full bg-[var(--brand-gold)] transition-all duration-500"
//                   style={{
//                     width: `${Math.min((adsWatchedToday / dailyLimit) * 100, 100)}%`,
//                   }}
//                 />
//               </div>
//               <p className="mt-2 text-xs text-white/40">
//                 {taskClass?.name ?? taskClassId}
//               </p>
//             </div>

//             {/* Cash earned today */}
//             <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
//               <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
//                 Cash Earned Today
//               </p>
//               <p className="mt-1 text-2xl font-bold text-[var(--brand-gold)]">
//                 {formatCurrency(earnedToday)}
//               </p>
//               <p className="mt-2 text-xs text-white/40">Credited to wallet</p>
//             </div>

//             {/* Points earned today */}
//             <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
//               <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
//                 Points Earned Today
//               </p>
//               <p className="mt-1 text-2xl font-bold text-violet-400">
//                 {pointsToday}
//               </p>
//               <p className="mt-2 text-xs text-white/40">Added to leaderboard</p>
//             </div>
//           </div>
//         )}

//         {/* Daily limit banner */}
//         {taskClassId && limitReached && (
//           <div className="flex items-center gap-3 rounded-xl border border-[var(--brand-gold)]/20 bg-[var(--brand-gold)]/5 px-4 py-3">
//             <MdInfo className="shrink-0 text-xl text-[var(--brand-gold)]" />
//             <p className="text-sm text-white/80">
//               You&apos;ve reached your daily limit of{" "}
//               <span className="font-medium">{dailyLimit} ads</span> for{" "}
//               <span className="font-medium">{taskClass?.name ?? taskClassId}</span>.
//               Limits reset at midnight UTC.
//             </p>
//           </div>
//         )}

//         {/* Error */}
//         {claimError && (
//           <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
//             {claimError}
//           </div>
//         )}

//         {/* Ads grid — only shown when user has a class */}
//         {taskClassId && (
//           <>
//             {ads.length === 0 ? (
//               <div className="rounded-2xl border border-white/10 bg-zinc-900 p-10 text-center">
//                 <MdOndemandVideo className="mx-auto text-5xl text-white/20" />
//                 <p className="mt-3 text-sm text-white/40">
//                   No ads available right now. Check back soon.
//                 </p>
//               </div>
//             ) : (
//               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
//                 {ads.map((ad) => {
//                   const isWatched = watchedIds.has(ad.id);
//                   const isLocked =
//                     !isWatched && (limitReached || watchingAd !== null);
//                   const catColor =
//                     CATEGORY_COLORS[ad.category] ?? CATEGORY_COLORS.General;
//                   const gradient =
//                     CATEGORY_GRADIENTS[ad.category] ??
//                     CATEGORY_GRADIENTS.General;

//                   return (
//                     <div
//                       key={ad.id}
//                       className={`overflow-hidden rounded-2xl border bg-zinc-900 transition-all ${
//                         isWatched ? "border-green-500/20" : "border-white/10"
//                       }`}
//                     >
//                       {/* Visual banner */}
//                       <div
//                         className={`relative flex h-32 items-center justify-center bg-gradient-to-br ${gradient}`}
//                       >
//                         <MdOndemandVideo className="text-4xl text-white/20" />
//                         {isWatched && (
//                           <div className="absolute inset-0 flex items-center justify-center bg-black/40">
//                             <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-green-400 bg-green-400/20">
//                               <MdCheck className="text-xl text-green-400" />
//                             </div>
//                           </div>
//                         )}
//                         <span
//                           className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${catColor}`}
//                         >
//                           {ad.category}
//                         </span>
//                         <span
//                           className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
//                             ad.reward_type === "cash"
//                               ? "bg-[var(--brand-gold)]/20 text-[var(--brand-gold)]"
//                               : "bg-violet-500/20 text-violet-400"
//                           }`}
//                         >
//                           {ad.reward_type === "cash" ? "Cash" : "Points"}
//                         </span>
//                       </div>

//                       <div className="p-4">
//                         <h3 className="text-sm font-semibold leading-snug text-white">
//                           {ad.title}
//                         </h3>
//                         <div className="mt-1 flex items-center gap-1 text-xs text-white/40">
//                           <MdTimer className="text-sm" />
//                           {ad.duration_seconds}s
//                         </div>
//                         <p
//                           className={`mt-2 text-lg font-bold ${
//                             ad.reward_type === "cash"
//                               ? "text-[var(--brand-gold)]"
//                               : "text-violet-400"
//                           }`}
//                         >
//                           {ad.reward_type === "cash"
//                             ? `+${formatCurrency(ad.reward_amount)}`
//                             : `+${Math.round(ad.reward_amount)} pts`}
//                         </p>

//                         <button
//                           type="button"
//                           onClick={() => startWatching(ad)}
//                           disabled={isWatched || isLocked}
//                           className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-all ${
//                             isWatched
//                               ? "cursor-default bg-green-500/10 text-green-400"
//                               : isLocked
//                                 ? "cursor-not-allowed bg-white/5 text-white/25"
//                                 : "bg-[var(--brand-gold)] text-black hover:brightness-110 active:scale-95"
//                           }`}
//                         >
//                           {isWatched ? (
//                             <>
//                               <MdCheck />
//                               Watched
//                             </>
//                           ) : isLocked ? (
//                             <>
//                               <MdLock />
//                               {limitReached ? "Limit reached" : "Busy"}
//                             </>
//                           ) : (
//                             <>
//                               <MdPlayArrow />
//                               Watch
//                             </>
//                           )}
//                         </button>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             )}
//           </>
//         )}

//         {taskClassId && (
//           <p className="text-center text-xs text-white/25">
//             Cash rewards are credited directly to your wallet. Points are added
//             to the leaderboard. Daily limits reset at midnight UTC.
//           </p>
//         )}
//       </div>
//     </>
//   );
// }

// "use client";

// import { useState, useEffect, useRef, useCallback } from "react";
// import Link from "next/link";
// import {
//   MdOndemandVideo,
//   MdPlayArrow,
//   MdCheck,
//   MdLock,
//   MdTimer,
//   MdCheckCircle,
//   MdInfo,
//   MdCardMembership,
// } from "react-icons/md";
// import { claimAdReward } from "./actions";
// import { formatCurrency } from "@/lib/currency";
// import { TASK_CLASSES } from "@/components/dashboard/task-class-data";
// import type { AdRow } from "@/lib/database.types";

// const CLASS_DAILY_LIMITS: Record<string, number> = {
//   "task-class-1": 3,
//   "task-class-2": 5,
//   "upscale-class": 7,
//   "superior-class": 10,
//   "junior-manager": 12,
//   "mid-executive": 15,
//   executive: 18,
//   "senior-executive": 20,
// };

// const CATEGORY_COLORS: Record<string, string> = {
//   Finance: "bg-blue-500/15 text-blue-400",
//   Education: "bg-violet-500/15 text-violet-400",
//   Shopping: "bg-pink-500/15 text-pink-400",
//   Lifestyle: "bg-emerald-500/15 text-emerald-400",
//   Energy: "bg-amber-500/15 text-amber-400",
//   General: "bg-zinc-500/15 text-zinc-400",
// };

// const CATEGORY_GRADIENTS: Record<string, string> = {
//   Finance: "from-blue-600/30 to-blue-950/60",
//   Education: "from-violet-600/30 to-violet-950/60",
//   Shopping: "from-pink-600/30 to-pink-950/60",
//   Lifestyle: "from-emerald-600/30 to-emerald-950/60",
//   Energy: "from-amber-600/30 to-amber-950/60",
//   General: "from-zinc-600/30 to-zinc-950/60",
// };

// interface ToastItem {
//   id: number;
//   type: "cash" | "points";
//   amount: number;
// }

// interface Props {
//   ads: AdRow[];
//   viewedAdIds: string[];
//   taskClassId: string | null;
//   todayEarned: number;
//   todayPoints: number;
// }

// // ── Watch Modal ────────────────────────────────────────────────
// function WatchModal({
//   ad,
//   onDone,
// }: {
//   ad: AdRow;
//   onDone: (adId: string) => void;
// }) {
//   const [countdown, setCountdown] = useState(ad.duration_seconds);
//   const doneCalledRef = useRef(false);
//   const onDoneRef = useRef(onDone);
//   onDoneRef.current = onDone;

//   useEffect(() => {
//     if (countdown <= 0) {
//       if (!doneCalledRef.current) {
//         doneCalledRef.current = true;
//         onDoneRef.current(ad.id);
//       }
//       return;
//     }
//     const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
//     return () => clearTimeout(timer);
//   }, [countdown, ad.id]);

//   const progress =
//     ((ad.duration_seconds - countdown) / ad.duration_seconds) * 100;
//   const gradient =
//     CATEGORY_GRADIENTS[ad.category] ?? CATEGORY_GRADIENTS.General;
//   const catColor = CATEGORY_COLORS[ad.category] ?? CATEGORY_COLORS.General;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
//       <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl">
//         {/* Video placeholder / SDK injection point */}
//         <div
//           className={`relative flex h-44 flex-col items-center justify-center bg-gradient-to-br ${gradient}`}
//         >
//           <div
//             id="ad-container"
//             className="absolute inset-0 flex items-center justify-center"
//           >
//             {/* Ad provider SDK renders here — replace placeholder with real VAST/rewarded video player */}
//             <div className="flex flex-col items-center gap-2 text-center">
//               <MdOndemandVideo className="animate-pulse text-5xl text-white/25" />
//               <p className="px-6 text-sm font-medium text-white/50">
//                 {ad.title}
//               </p>
//             </div>
//           </div>

//           <span
//             className={`absolute left-3 top-3 z-10 rounded-full px-2 py-0.5 text-[10px] font-semibold ${catColor}`}
//           >
//             {ad.category}
//           </span>
//           <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 font-mono text-xs font-bold text-white">
//             <MdTimer className="text-sm" />
//             {countdown}s
//           </div>
//         </div>

//         {/* Progress bar */}
//         <div className="h-1 bg-white/10">
//           <div
//             className="h-full bg-[var(--brand-gold)] transition-all duration-1000 ease-linear"
//             style={{ width: `${progress}%` }}
//           />
//         </div>

//         <div className="space-y-4 p-5">
//           <div>
//             <h3 className="text-base font-semibold text-white">{ad.title}</h3>
//             <p className="mt-0.5 text-sm text-white/50">
//               Watch the full ad to earn your reward
//             </p>
//           </div>

//           <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
//             <span className="text-sm text-white/60">Your reward</span>
//             <span
//               className={`text-base font-bold ${
//                 ad.reward_type === "cash"
//                   ? "text-[var(--brand-gold)]"
//                   : "text-violet-400"
//               }`}
//             >
//               {ad.reward_type === "cash"
//                 ? `+${formatCurrency(ad.reward_amount)}`
//                 : `+${Math.round(ad.reward_amount)} pts`}
//             </span>
//           </div>

//           <p className="text-center text-[11px] text-white/25">
//             Do not close this window. Reward will be credited automatically.
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── Main Component ─────────────────────────────────────────────
// export default function WatchAdsClient({
//   ads,
//   viewedAdIds,
//   taskClassId,
//   todayEarned,
//   todayPoints,
// }: Props) {
//   // ==========================================================
//   // TEST MODE (REMOVE BEFORE PRODUCTION)
//   // ==========================================================
//   const TEST_MODE = true; // Set to false to use real data

//   const TEST_CLASS_ID = "task-class-1";
//   const TEST_EARNED = 1250;
//   const TEST_POINTS = 430;
//   const TEST_VIEWED_ADS: string[] = [];
//   // ==========================================================

//   // Use either the real values or the test values
//   const effectiveTaskClassId = TEST_MODE ? TEST_CLASS_ID : taskClassId;

//   const effectiveTodayEarned = TEST_MODE ? TEST_EARNED : todayEarned;

//   const effectiveTodayPoints = TEST_MODE ? TEST_POINTS : todayPoints;

//   const effectiveViewedAds = TEST_MODE ? TEST_VIEWED_ADS : viewedAdIds;

//   const dailyLimit = effectiveTaskClassId
//     ? (CLASS_DAILY_LIMITS[effectiveTaskClassId] ?? 0)
//     : 0;
//   const taskClass =
//     TASK_CLASSES.find((c) => c.id === effectiveTaskClassId) ?? null;

//   const [watchedIds, setWatchedIds] = useState<Set<string>>(
//     new Set(effectiveViewedAds),
//   );
//   const [watchingAd, setWatchingAd] = useState<AdRow | null>(null);
//   const [isClaiming, setIsClaiming] = useState(false);
//   const [earnedToday, setEarnedToday] = useState(effectiveTodayEarned);
//   const [pointsToday, setPointsToday] = useState(effectiveTodayPoints);
//   const [toasts, setToasts] = useState<ToastItem[]>([]);
//   const [claimError, setClaimError] = useState<string | null>(null);
//   const toastCounter = useRef(0);

//   const adsWatchedToday = watchedIds.size;
//   const limitReached = dailyLimit > 0 && adsWatchedToday >= dailyLimit;

//   const handleWatchComplete = useCallback(
//     async (adId: string) => {
//       const ad = ads.find((a) => a.id === adId);
//       if (!ad) {
//         setWatchingAd(null);
//         return;
//       }

//       setIsClaiming(true);
//       setClaimError(null);

//       let result;

//       if (TEST_MODE) {
//         // Fake a successful claim for testing
//         await new Promise((resolve) => setTimeout(resolve, 1500));
//         result = {
//           success: true,
//         };
//       } else {
//         result = await claimAdReward(adId);
//       }

//       setIsClaiming(false);
//       setWatchingAd(null);

//       if (result.success) {
//         setWatchedIds((prev) => new Set([...prev, adId]));
//         if (ad.reward_type === "cash") {
//           setEarnedToday((prev) => prev + ad.reward_amount);
//         } else {
//           setPointsToday((prev) => prev + Math.round(ad.reward_amount));
//         }
//         toastCounter.current += 1;
//         const id = toastCounter.current;
//         setToasts((prev) => [
//           ...prev,
//           { id, type: ad.reward_type, amount: ad.reward_amount },
//         ]);
//         setTimeout(
//           () => setToasts((prev) => prev.filter((t) => t.id !== id)),
//           4000,
//         );
//       } else {
//         setClaimError(
//           result.error === "already_watched"
//             ? "You already watched this ad today."
//             : result.error === "daily_limit_reached"
//               ? "Daily ad limit reached for your class."
//               : result.error === "no_class_registered"
//                 ? "You need an EarnPass class to watch ads."
//                 : "Failed to credit reward. Please try again.",
//         );
//       }
//     },
//     [ads],
//   );

//   function startWatching(ad: AdRow) {
//     if (watchedIds.has(ad.id) || limitReached || watchingAd !== null) return;
//     setClaimError(null);
//     setWatchingAd(ad);
//   }

//   return (
//     <>
//       {watchingAd && !isClaiming && (
//         <WatchModal ad={watchingAd} onDone={handleWatchComplete} />
//       )}

//       {isClaiming && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
//           <div className="flex flex-col items-center gap-3">
//             <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[var(--brand-gold)]" />
//             <p className="text-sm text-white/60">Crediting your reward…</p>
//           </div>
//         </div>
//       )}

//       {/* Toast notifications */}
//       <div className="fixed right-4 top-20 z-40 flex flex-col gap-2">
//         {toasts.map((toast) => (
//           <div
//             key={toast.id}
//             className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-zinc-900 px-4 py-3 shadow-xl"
//           >
//             <MdCheckCircle className="shrink-0 text-xl text-green-400" />
//             <span className="text-sm font-medium text-white">
//               {toast.type === "cash"
//                 ? `+${formatCurrency(toast.amount)} credited to wallet!`
//                 : `+${Math.round(toast.amount)} points earned!`}
//             </span>
//           </div>
//         ))}
//       </div>

//       <div className="mx-auto max-w-6xl space-y-6">
//         {/* Header */}
//         <div>
//           <h1 className="text-2xl font-bold text-white md:text-3xl">
//             Watch Ads
//           </h1>
//           <p className="mt-1 text-sm text-white/50">
//             Watch short video ads and earn cash or points instantly.
//           </p>
//         </div>

//         {/* No class registered — prompt to get EarnPass */}
//         {!effectiveTaskClassId && (
//           <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 p-6">
//             <div className="absolute inset-y-0 left-0 w-1 bg-[var(--brand-gold)]" />
//             <div className="flex items-start gap-4">
//               <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-gold)]/15 text-[var(--brand-gold)] shadow-[0_0_20px_rgba(244,163,0,0.25)]">
//                 <MdCardMembership className="text-2xl" />
//               </div>
//               <div>
//                 <h2 className="text-base font-bold text-white">
//                   You need an EarnPass class to watch ads
//                 </h2>
//                 <p className="mt-1 text-sm text-white/50">
//                   Register for a task class to unlock daily ad watch slots and
//                   start earning cash and points.
//                 </p>
//                 <Link
//                   href="/dashboard/earnpass"
//                   className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
//                 >
//                   <MdCardMembership className="text-base" />
//                   Get EarnPass
//                 </Link>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Stats — only shown when user has a class */}
//         {effectiveTaskClassId && (
//           <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
//             {/* Daily progress */}
//             <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
//               <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
//                 Daily Progress
//               </p>
//               <p className="mt-1 text-2xl font-bold text-white">
//                 {adsWatchedToday}
//                 <span className="text-base font-normal text-white/40">
//                   /{dailyLimit}
//                 </span>
//               </p>
//               <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
//                 <div
//                   className="h-full rounded-full bg-[var(--brand-gold)] transition-all duration-500"
//                   style={{
//                     width: `${Math.min((adsWatchedToday / dailyLimit) * 100, 100)}%`,
//                   }}
//                 />
//               </div>
//               <p className="mt-2 text-xs text-white/40">
//                 {taskClass?.name ?? effectiveTaskClassId}
//               </p>
//             </div>

//             {/* Cash earned today */}
//             <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
//               <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
//                 Cash Earned Today
//               </p>
//               <p className="mt-1 text-2xl font-bold text-[var(--brand-gold)]">
//                 {formatCurrency(earnedToday)}
//               </p>
//               <p className="mt-2 text-xs text-white/40">Credited to wallet</p>
//             </div>

//             {/* Points earned today */}
//             <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
//               <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
//                 Points Earned Today
//               </p>
//               <p className="mt-1 text-2xl font-bold text-violet-400">
//                 {pointsToday}
//               </p>
//               <p className="mt-2 text-xs text-white/40">Added to leaderboard</p>
//             </div>
//           </div>
//         )}

//         {/* Daily limit banner */}
//         {effectiveTaskClassId && limitReached && (
//           <div className="flex items-center gap-3 rounded-xl border border-[var(--brand-gold)]/20 bg-[var(--brand-gold)]/5 px-4 py-3">
//             <MdInfo className="shrink-0 text-xl text-[var(--brand-gold)]" />
//             <p className="text-sm text-white/80">
//               You&apos;ve reached your daily limit of{" "}
//               <span className="font-medium">{dailyLimit} ads</span> for{" "}
//               <span className="font-medium">
//                 {taskClass?.name ?? effectiveTaskClassId}
//               </span>
//               . Limits reset at midnight UTC.
//             </p>
//           </div>
//         )}

//         {/* Error */}
//         {claimError && (
//           <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
//             {claimError}
//           </div>
//         )}

//         {/* Ads grid — only shown when user has a class */}
//         {effectiveTaskClassId && (
//           <>
//             {ads.length === 0 ? (
//               <div className="rounded-2xl border border-white/10 bg-zinc-900 p-10 text-center">
//                 <MdOndemandVideo className="mx-auto text-5xl text-white/20" />
//                 <p className="mt-3 text-sm text-white/40">
//                   No ads available right now. Check back soon.
//                 </p>
//               </div>
//             ) : (
//               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
//                 {ads.map((ad) => {
//                   const isWatched = watchedIds.has(ad.id);
//                   const isLocked =
//                     !isWatched && (limitReached || watchingAd !== null);
//                   const catColor =
//                     CATEGORY_COLORS[ad.category] ?? CATEGORY_COLORS.General;
//                   const gradient =
//                     CATEGORY_GRADIENTS[ad.category] ??
//                     CATEGORY_GRADIENTS.General;

//                   return (
//                     <div
//                       key={ad.id}
//                       className={`overflow-hidden rounded-2xl border bg-zinc-900 transition-all ${
//                         isWatched ? "border-green-500/20" : "border-white/10"
//                       }`}
//                     >
//                       {/* Visual banner */}
//                       <div
//                         className={`relative flex h-32 items-center justify-center bg-gradient-to-br ${gradient}`}
//                       >
//                         <MdOndemandVideo className="text-4xl text-white/20" />
//                         {isWatched && (
//                           <div className="absolute inset-0 flex items-center justify-center bg-black/40">
//                             <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-green-400 bg-green-400/20">
//                               <MdCheck className="text-xl text-green-400" />
//                             </div>
//                           </div>
//                         )}
//                         <span
//                           className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${catColor}`}
//                         >
//                           {ad.category}
//                         </span>
//                         <span
//                           className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
//                             ad.reward_type === "cash"
//                               ? "bg-[var(--brand-gold)]/20 text-[var(--brand-gold)]"
//                               : "bg-violet-500/20 text-violet-400"
//                           }`}
//                         >
//                           {ad.reward_type === "cash" ? "Cash" : "Points"}
//                         </span>
//                       </div>

//                       <div className="p-4">
//                         <h3 className="text-sm font-semibold leading-snug text-white">
//                           {ad.title}
//                         </h3>
//                         <div className="mt-1 flex items-center gap-1 text-xs text-white/40">
//                           <MdTimer className="text-sm" />
//                           {ad.duration_seconds}s
//                         </div>
//                         <p
//                           className={`mt-2 text-lg font-bold ${
//                             ad.reward_type === "cash"
//                               ? "text-[var(--brand-gold)]"
//                               : "text-violet-400"
//                           }`}
//                         >
//                           {ad.reward_type === "cash"
//                             ? `+${formatCurrency(ad.reward_amount)}`
//                             : `+${Math.round(ad.reward_amount)} pts`}
//                         </p>

//                         <button
//                           type="button"
//                           onClick={() => startWatching(ad)}
//                           disabled={isWatched || isLocked}
//                           className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-all ${
//                             isWatched
//                               ? "cursor-default bg-green-500/10 text-green-400"
//                               : isLocked
//                                 ? "cursor-not-allowed bg-white/5 text-white/25"
//                                 : "bg-[var(--brand-gold)] text-black hover:brightness-110 active:scale-95"
//                           }`}
//                         >
//                           {isWatched ? (
//                             <>
//                               <MdCheck />
//                               Watched
//                             </>
//                           ) : isLocked ? (
//                             <>
//                               <MdLock />
//                               {limitReached ? "Limit reached" : "Busy"}
//                             </>
//                           ) : (
//                             <>
//                               <MdPlayArrow />
//                               Watch
//                             </>
//                           )}
//                         </button>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             )}
//           </>
//         )}
//        {effectiveTaskClassId && (
//           <p className="text-center text-xs text-white/25">
//             Cash rewards are credited directly to your wallet. Points are added
//             to the leaderboard. Daily limits reset at midnight UTC.
//           </p>
//         )}
//       </div>
//     </>
//   );
// }

"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  MdOndemandVideo,
  MdPlayArrow,
  MdCheck,
  MdLock,
  MdTimer,
  MdCheckCircle,
  MdInfo,
  MdCardMembership,
} from "react-icons/md";
import { claimAdReward } from "./actions";
import { formatCurrency } from "@/lib/currency";
import { TASK_CLASSES } from "@/components/dashboard/task-class-data";
import type { AdRow } from "@/lib/database.types";

const CLASS_DAILY_LIMITS: Record<string, number> = {
  "task-class-1": 3,
  "task-class-2": 5,
  "upscale-class": 7,
  "superior-class": 10,
  "junior-manager": 12,
  "mid-executive": 15,
  executive: 18,
  "senior-executive": 20,
};

const CATEGORY_COLORS: Record<string, string> = {
  Finance: "bg-blue-500/15 text-blue-400",
  Education: "bg-violet-500/15 text-violet-400",
  Shopping: "bg-pink-500/15 text-pink-400",
  Lifestyle: "bg-emerald-500/15 text-emerald-400",
  Energy: "bg-amber-500/15 text-amber-400",
  General: "bg-zinc-500/15 text-zinc-400",
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  Finance: "from-blue-600/30 to-blue-950/60",
  Education: "from-violet-600/30 to-violet-950/60",
  Shopping: "from-pink-600/30 to-pink-950/60",
  Lifestyle: "from-emerald-600/30 to-emerald-950/60",
  Energy: "from-amber-600/30 to-amber-950/60",
  General: "from-zinc-600/30 to-zinc-950/60",
};

interface ToastItem {
  id: number;
  type: "cash" | "points";
  amount: number;
}

interface Props {
  ads: AdRow[];
  viewedAdIds: string[];
  taskClassId: string | null;
  todayEarned: number;
  todayPoints: number;
}

type AdStatus = "idle" | "loading" | "playing" | "error";

// ── Debug Logger ───────────────────────────────────────────────
const debugLog = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 📺 AD DEBUG: ${message}`, data || "");
};

// ── AyeT-Studios Video Player with Google IMA ──────────────────
function VideoAdPlayer({
  ad,
  onComplete,
}: {
  ad: AdRow;
  onComplete: (adId: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const adContainerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<AdStatus>("idle");
  const [remainingTime, setRemainingTime] = useState(ad.duration_seconds);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const onCompleteRef = useRef(onComplete);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  onCompleteRef.current = onComplete;

  const addDebug = useCallback((message: string) => {
    debugLog(message);
    if (isMountedRef.current) {
      setDebugInfo((prev) => {
        const newInfo = [
          ...prev,
          `${new Date().toLocaleTimeString()}: ${message}`,
        ];
        if (newInfo.length > 20) return newInfo.slice(-20);
        return newInfo;
      });
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const VAST_TAG = useMemo(() => {
    const tag =
      ad.vastTagUrl ||
      `https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=${Date.now()}`;
    addDebug(`VAST Tag: ${tag.substring(0, 80)}...`);
    return tag;
  }, [ad.vastTagUrl, addDebug]);

  // Load IMA SDK
  useEffect(() => {
    addDebug("Loading IMA SDK...");
    if (!document.querySelector('script[src*="imasdk.googleapis.com"]')) {
      const script = document.createElement("script");
      script.src = "https://imasdk.googleapis.com/js/sdkloader/ima3.js";
      script.async = true;
      script.onload = () => addDebug("IMA SDK loaded successfully");
      script.onerror = () => addDebug("Failed to load IMA SDK");
      document.head.appendChild(script);
    } else {
      addDebug("IMA SDK already loaded");
    }
  }, [addDebug]);

  useEffect(() => {
    if (status !== "playing") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          addDebug("Ad timer reached 0");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status, addDebug]);

  const startAd = useCallback(() => {
    addDebug("▶️ startAd() called");

    if (!adContainerRef.current || !videoRef.current) {
      addDebug("❌ ERROR: Ad container or video element not ready");
      setStatus("error");
      setTimeout(() => onCompleteRef.current(ad.id), 1000);
      return;
    }

    setStatus("loading");
    addDebug("📶 Status set to loading");

    try {
      if (typeof google === "undefined" || !google.ima) {
        addDebug("⏳ IMA SDK not loaded, waiting...");
        setTimeout(() => {
          if (typeof google !== "undefined" && google.ima) {
            addDebug("✅ IMA SDK now loaded, retrying...");
            startAd();
          } else {
            addDebug("❌ ERROR: IMA SDK still not loaded after retry");
            setStatus("error");
            setTimeout(
              () => onCompleteRef.current(ad.id),
              ad.duration_seconds * 1000,
            );
          }
        }, 1000);
        return;
      }

      addDebug("🛠️ Creating AdDisplayContainer");
      const adDisplayContainer = new google.ima.AdDisplayContainer(
        adContainerRef.current,
        videoRef.current,
      );

      addDebug("🛠️ Initializing AdDisplayContainer (CRITICAL STEP)");
      adDisplayContainer.initialize();

      addDebug("🛠️ Creating AdsLoader");
      const adsLoader = new google.ima.AdsLoader(adDisplayContainer);

      adsLoader.addEventListener(
        google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
        (e: any) => {
          addDebug("📥 AdsManagerLoaded event fired");
          try {
            const adsManager = e.getAdsManager(videoRef.current);
            addDebug("✅ AdsManager created successfully");

            adsManager.addEventListener(
              google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,
              () => {
                addDebug("✅ Ad completed (CONTENT_RESUME_REQUESTED)");
                setStatus("idle");
                if (timerRef.current) {
                  clearInterval(timerRef.current);
                  timerRef.current = null;
                }
                onCompleteRef.current(ad.id);
              },
            );

            adsManager.addEventListener(
              google.ima.AdEvent.Type.COMPLETE,
              () => {
                addDebug("✅ Ad completed (COMPLETE)");
                setStatus("idle");
                if (timerRef.current) {
                  clearInterval(timerRef.current);
                  timerRef.current = null;
                }
                onCompleteRef.current(ad.id);
              },
            );

            adsManager.addEventListener(
              google.ima.AdErrorEvent.Type.AD_ERROR,
              (error: any) => {
                addDebug("❌ Ad error event", { error });
                console.error("Ad error details:", error);
                setStatus("error");
                if (timerRef.current) {
                  clearInterval(timerRef.current);
                  timerRef.current = null;
                }
                setTimeout(() => onCompleteRef.current(ad.id), 1000);
              },
            );

            setTimeout(() => {
              addDebug("🛠️ Initializing AdsManager");
              adsManager.init(640, 360, google.ima.ViewMode.NORMAL);
              addDebug("▶️ Starting AdsManager");
              adsManager.start();
              setStatus("playing");
              addDebug("📶 Status set to playing");
            }, 500);
          } catch (err) {
            addDebug("❌ ERROR in AdsManagerLoaded event", { error: err });
            console.error("AdsManager error:", err);
            setStatus("error");
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            setTimeout(() => onCompleteRef.current(ad.id), 1000);
          }
        },
      );

      adsLoader.addEventListener(
        google.ima.AdErrorEvent.Type.AD_ERROR,
        (error: any) => {
          addDebug("❌ Ad loader error", { error });
          console.error("Ad loader error details:", error);
          setStatus("error");
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setTimeout(() => onCompleteRef.current(ad.id), 1000);
        },
      );

      addDebug(`📤 Requesting ads from: ${VAST_TAG.substring(0, 80)}...`);
      const adsRequest = new google.ima.AdsRequest();
      adsRequest.adTagUrl = VAST_TAG;
      adsRequest.linearAdSlotWidth = 640;
      adsRequest.linearAdSlotHeight = 360;

      adsLoader.requestAds(adsRequest);
      addDebug("📤 Ad request sent");
    } catch (err) {
      addDebug("❌ CRITICAL ERROR in startAd", { error: err });
      console.error("Critical error:", err);
      setStatus("error");
      setTimeout(() => onCompleteRef.current(ad.id), 1000);
    }
  }, [ad.id, ad.duration_seconds, VAST_TAG, addDebug]);

  const progress =
    ad.duration_seconds > 0
      ? ((ad.duration_seconds - remainingTime) / ad.duration_seconds) * 100
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl">
        <div className="relative">
          <div
            ref={adContainerRef}
            className="relative w-full bg-zinc-800"
            style={{ height: "360px" }}
          >
            {status === "idle" && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center text-white/50">
                  <MdOndemandVideo className="mx-auto text-5xl" />
                  <p className="mt-3 text-sm">
                    Click &quot;Watch Ad&quot; to start
                  </p>
                </div>
              </div>
            )}

            {status === "loading" && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[var(--brand-gold)]" />
                  <p className="mt-2 text-sm text-white/50">Loading ad...</p>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="flex h-full flex-col items-center justify-center">
                <div className="px-6 text-center">
                  <MdInfo className="mx-auto text-4xl text-red-400" />
                  <p className="mt-2 text-sm text-white/60">
                    Ad failed to load. Reward credited shortly.
                  </p>
                </div>
              </div>
            )}
          </div>

          <video ref={videoRef} className="hidden" playsInline />

          {status === "playing" && (
            <div className="absolute bottom-0 left-0 right-0 z-10">
              <div className="h-1.5 bg-black/50">
                <div
                  className="h-full bg-[var(--brand-gold)] transition-all duration-500"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-3">
            <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
              {ad.category}
            </span>
            {status === "playing" && (
              <span className="flex items-center gap-1 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
                <MdTimer className="text-sm" />
                {remainingTime}s
              </span>
            )}
          </div>

          <div className="pointer-events-none absolute right-4 top-4 z-10 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold">
            <span
              className={
                ad.reward_type === "cash"
                  ? "text-[var(--brand-gold)]"
                  : "text-violet-400"
              }
            >
              +
              {ad.reward_type === "cash"
                ? formatCurrency(ad.reward_amount)
                : `${Math.round(ad.reward_amount)} pts`}
            </span>
          </div>

          {process.env.NODE_ENV === "development" && (
            <button
              onClick={() => {
                const debugSection = document.getElementById("debug-info");
                if (debugSection) debugSection.classList.toggle("hidden");
              }}
              className="absolute bottom-2 right-2 z-20 rounded-full bg-black/50 p-1.5 text-xs text-white/40 hover:bg-black/70 hover:text-white/80"
            >
              <MdInfo className="text-lg" />
            </button>
          )}
        </div>

        <div className="p-4">
          <h3 className="text-base font-semibold text-white">{ad.title}</h3>
          <p className="mt-0.5 text-sm text-white/50">
            {status === "playing"
              ? `Ad is playing... ${remainingTime}s remaining`
              : status === "error"
                ? "Having trouble loading the ad."
                : "Watch the ad to earn your reward"}
          </p>
          <button
            onClick={startAd}
            disabled={status !== "idle"}
            className="mt-3 w-full rounded-xl bg-[var(--brand-gold)] py-2.5 text-sm font-semibold text-black transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "idle"
              ? "▶ Watch Ad"
              : status === "loading"
                ? "Loading..."
                : status === "playing"
                  ? `Ad Playing... ${remainingTime}s`
                  : "Please wait..."}
          </button>
          <p className="mt-2 text-center text-[11px] text-white/25">
            Do not close this window. Reward will be credited automatically.
          </p>
        </div>

        {process.env.NODE_ENV === "development" && (
          <div
            id="debug-info"
            className="hidden border-t border-white/10 bg-black/50 p-3 text-xs font-mono text-white/60 max-h-40 overflow-y-auto"
          >
            <p className="mb-1 font-semibold text-white/80">🐛 Debug Log:</p>
            {debugInfo.map((msg, i) => (
              <p key={i} className="py-0.5 border-b border-white/5">
                {msg}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function WatchAdsClient({
  ads,
  viewedAdIds,
  taskClassId,
  todayEarned,
  todayPoints,
}: Props) {
  const forcedTaskClassId = "task-class-1";

  const effectiveAds = useMemo(() => {
    if (ads.length > 0) return ads;
    return [
      {
        id: "test-ad-1",
        title: "Sponsored Video - Watch & Earn",
        duration_seconds: 30,
        category: "General",
        reward_type: "cash" as const,
        reward_amount: 0.5,
        vastTagUrl: `https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=${Date.now()}`,
      },
      {
        id: "test-ad-2",
        title: "Exclusive Offer - Watch Now",
        duration_seconds: 30,
        category: "General",
        reward_type: "points" as const,
        reward_amount: 50,
        vastTagUrl: `https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=${Date.now() + 1}`,
      },
    ];
  }, [ads]);

  const effectiveTaskClassId = forcedTaskClassId;
  const effectiveTodayEarned = todayEarned;
  const effectiveTodayPoints = todayPoints;
  const effectiveViewedAds = viewedAdIds;

  const dailyLimit = effectiveTaskClassId
    ? (CLASS_DAILY_LIMITS[effectiveTaskClassId] ?? 0)
    : 0;
  const taskClass =
    TASK_CLASSES.find((c) => c.id === effectiveTaskClassId) ?? null;

  const [watchedIds, setWatchedIds] = useState<Set<string>>(
    new Set(effectiveViewedAds),
  );
  const [watchingAd, setWatchingAd] = useState<AdRow | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [earnedToday, setEarnedToday] = useState(effectiveTodayEarned);
  const [pointsToday, setPointsToday] = useState(effectiveTodayPoints);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [claimError, setClaimError] = useState<string | null>(null);
  const toastCounter = useRef(0);

  const adsWatchedToday = watchedIds.size;
  const limitReached = dailyLimit > 0 && adsWatchedToday >= dailyLimit;

  const handleWatchComplete = useCallback(
    async (adId: string) => {
      const ad = effectiveAds.find((a) => a.id === adId);
      if (!ad) {
        setWatchingAd(null);
        return;
      }

      setIsClaiming(true);
      setClaimError(null);

      // TRUST SUCCESS FOR THIS GOOGLE TEST
      const result = { success: true };

      setIsClaiming(false);
      setWatchingAd(null);

      if (result.success) {
        setWatchedIds((prev) => new Set([...prev, adId]));
        if (ad.reward_type === "cash")
          setEarnedToday((prev) => prev + ad.reward_amount);
        else setPointsToday((prev) => prev + Math.round(ad.reward_amount));

        toastCounter.current += 1;
        const id = toastCounter.current;
        setToasts((prev) => [
          ...prev,
          { id, type: ad.reward_type, amount: ad.reward_amount },
        ]);
        setTimeout(
          () => setToasts((prev) => prev.filter((t) => t.id !== id)),
          4000,
        );
      } else {
        setClaimError("Failed to credit reward. Please try again.");
      }
    },
    [effectiveAds],
  );

  const startWatching = useCallback(
    (ad: AdRow) => {
      if (watchedIds.has(ad.id) || limitReached || watchingAd !== null) return;
      setClaimError(null);
      setWatchingAd(ad);
    },
    [watchedIds, limitReached, watchingAd],
  );

  return (
    <>
      {watchingAd && !isClaiming && (
        <VideoAdPlayer ad={watchingAd} onComplete={handleWatchComplete} />
      )}
      {isClaiming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[var(--brand-gold)]" />
            <p className="text-sm text-white/60">Crediting your reward…</p>
          </div>
        </div>
      )}
      <div className="fixed right-4 top-20 z-40 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-zinc-900 px-4 py-3 shadow-xl"
          >
            <MdCheckCircle className="shrink-0 text-xl text-green-400" />
            <span className="text-sm font-medium text-white">
              {toast.type === "cash"
                ? `+${formatCurrency(toast.amount)} credited to wallet!`
                : `+${Math.round(toast.amount)} points earned!`}
            </span>
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">
            Watch Ads
          </h1>
          <p className="mt-1 text-sm text-white/50">
            Watch short video ads and earn cash or points instantly.
          </p>
        </div>

        {effectiveTaskClassId && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
                Daily Progress
              </p>
              <p className="mt-1 text-2xl font-bold text-white">
                {adsWatchedToday}
                <span className="text-base font-normal text-white/40">
                  /{dailyLimit}
                </span>
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[var(--brand-gold)] transition-all duration-500"
                  style={{
                    width: `${Math.min((adsWatchedToday / dailyLimit) * 100, 100)}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-white/40">
                {taskClass?.name ?? effectiveTaskClassId}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
                Cash Earned Today
              </p>
              <p className="mt-1 text-2xl font-bold text-[var(--brand-gold)]">
                {formatCurrency(earnedToday)}
              </p>
              <p className="mt-2 text-xs text-white/40">Credited to wallet</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
                Points Earned Today
              </p>
              <p className="mt-1 text-2xl font-bold text-violet-400">
                {pointsToday}
              </p>
              <p className="mt-2 text-xs text-white/40">Added to leaderboard</p>
            </div>
          </div>
        )}

        {effectiveTaskClassId && limitReached && (
          <div className="flex items-center gap-3 rounded-xl border border-[var(--brand-gold)]/20 bg-[var(--brand-gold)]/5 px-4 py-3">
            <MdInfo className="shrink-0 text-xl text-[var(--brand-gold)]" />
            <p className="text-sm text-white/80">
              You&apos;ve reached your daily limit of{" "}
              <span className="font-medium">{dailyLimit} ads</span>. Limits
              reset at midnight UTC.
            </p>
          </div>
        )}

        {claimError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {claimError}
          </div>
        )}

        {effectiveTaskClassId && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {effectiveAds.map((ad) => {
              const isWatched = watchedIds.has(ad.id);
              const isLocked =
                !isWatched && (limitReached || watchingAd !== null);
              const catColor =
                CATEGORY_COLORS[ad.category] ?? CATEGORY_COLORS.General;
              const gradient =
                CATEGORY_GRADIENTS[ad.category] ?? CATEGORY_GRADIENTS.General;

              return (
                <div
                  key={ad.id}
                  className={`overflow-hidden rounded-2xl border bg-zinc-900 transition-all ${isWatched ? "border-green-500/20" : "border-white/10"}`}
                >
                  <div
                    className={`relative flex h-32 items-center justify-center bg-gradient-to-br ${gradient}`}
                  >
                    <MdOndemandVideo className="text-4xl text-white/20" />
                    {isWatched && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-green-400 bg-green-400/20">
                          <MdCheck className="text-xl text-green-400" />
                        </div>
                      </div>
                    )}
                    <span
                      className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${catColor}`}
                    >
                      {ad.category}
                    </span>
                    <span
                      className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${ad.reward_type === "cash" ? "bg-[var(--brand-gold)]/20 text-[var(--brand-gold)]" : "bg-violet-500/20 text-violet-400"}`}
                    >
                      {ad.reward_type === "cash" ? "Cash" : "Points"}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold leading-snug text-white">
                      {ad.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-1 text-xs text-white/40">
                      <MdTimer className="text-sm" />
                      {ad.duration_seconds}s
                    </div>
                    <p
                      className={`mt-2 text-lg font-bold ${ad.reward_type === "cash" ? "text-[var(--brand-gold)]" : "text-violet-400"}`}
                    >
                      {ad.reward_type === "cash"
                        ? `+${formatCurrency(ad.reward_amount)}`
                        : `+${Math.round(ad.reward_amount)} pts`}
                    </p>
                    <button
                      type="button"
                      onClick={() => startWatching(ad)}
                      disabled={isWatched || isLocked}
                      className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-all ${isWatched ? "cursor-default bg-green-500/10 text-green-400" : isLocked ? "cursor-not-allowed bg-white/5 text-white/25" : "bg-[var(--brand-gold)] text-black hover:brightness-110 active:scale-95"}`}
                    >
                      {isWatched ? (
                        <>
                          <MdCheck /> Watched
                        </>
                      ) : isLocked ? (
                        <>
                          <MdLock /> {limitReached ? "Limit reached" : "Busy"}
                        </>
                      ) : (
                        <>
                          <MdPlayArrow /> Watch
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
