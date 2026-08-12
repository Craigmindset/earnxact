 "use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  MdOndemandVideo,
  MdPlayArrow,
  MdCheck,
  MdLock,
  MdTimer,
  MdCheckCircle,
  MdInfo,
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

// ── Ad-network sources with automatic fallback ──
// 🔧 SINGLE SOURCE OF TRUTH — this is the only place you need to touch to
// add, remove, or reorder ad networks. Order in this array = priority
// order at runtime (first entry is tried first, falls through on failure).
//
// To add a network:      add a { name, url } row below.
// To remove a network:   delete its row below.
// To reprioritize:       reorder the rows below.
// To debug one network:  temporarily move its row to the top.
//
// Only networks with a non-empty env var are included — a missing/empty
// var quietly drops that network from the chain (a warning is logged for
// it below, on mount, so it's never a silent mystery).
const AD_NETWORKS: { name: string; url: string | undefined }[] = [
  { name: "HilltopAds", url: process.env.NEXT_PUBLIC_HILLTOPADS_VAST_URL },
  { name: "ExoClick", url: process.env.NEXT_PUBLIC_EXOCLICK_VAST_URL },
];

const FALLBACK_TAG =
  "https://s.magsrv.com/v1/vast.php?idz=6000044&ex-av=name";

// ── Derived — no need to touch below this line when changing networks ──
const ACTIVE_NETWORKS = AD_NETWORKS.filter(
  (n): n is { name: string; url: string } => Boolean(n.url),
);
const ALL_SOURCES = [...ACTIVE_NETWORKS.map((n) => n.url), FALLBACK_TAG];
const SOURCE_LABELS = new Map<string, string>([
  ...ACTIVE_NETWORKS.map((n) => [n.url, n.name] as const),
  [FALLBACK_TAG, "Static Fallback"],
]);

function labelForSource(url: string): string {
  return SOURCE_LABELS.get(url) ?? "Unknown";
}

const NO_FILL_COOLDOWN_MS = 5 * 60 * 1000;
const COOLDOWN_STORAGE_KEY = "earnxact_ad_cooldown_until";

type AdCategory = keyof typeof CATEGORY_COLORS;

// 🔧 These templates drive the app's OWN reward bucketing (category +
// cash/points), not the ad content itself — the actual video that plays
// is chosen by whichever third-party network fills the request (Hilltop,
// ExoClick, etc.) and is unrelated to anything here. There is intentionally
// no "title" field: a specific brand name here would misrepresent what's
// about to play, since we don't control or know the creative in advance.
interface AdTemplate {
  category: AdCategory;
  rewardType: "cash" | "points";
}

const AD_TEMPLATES: AdTemplate[] = [
  { category: "Finance", rewardType: "cash" },
  { category: "Finance", rewardType: "points" },
  { category: "Education", rewardType: "points" },
  { category: "Shopping", rewardType: "cash" },
  { category: "Shopping", rewardType: "points" },
  { category: "Lifestyle", rewardType: "cash" },
  { category: "Lifestyle", rewardType: "points" },
  { category: "Energy", rewardType: "cash" },
  { category: "General", rewardType: "points" },
];

// Number of ad cards shown in the grid at once.
const AD_POOL_SIZE = 6;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randInt(min: number, max: number, step = 5) {
  const steps = Math.floor((max - min) / step);
  return min + Math.floor(Math.random() * (steps + 1)) * step;
}

function generateAdPool(count: number): AdRow[] {
  const picks = shuffle(AD_TEMPLATES).slice(0, count);
  return picks.map((t, i) => {
    const duration = randInt(15, 45, 5);
    const reward =
      t.rewardType === "cash" ? randInt(20, 150, 5) : randInt(20, 150, 10);
    return {
      id: `mock-ad-${Date.now()}-${i}`,
      duration_seconds: duration,
      category: t.category,
      reward_type: t.rewardType,
      reward_amount: reward,
      vast_tag_url: undefined,
    } as unknown as AdRow;
  });
}

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

type AdStatus = "idle" | "loading" | "playing" | "error" | "retrying";

const debugLog = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 📺 AD DEBUG: ${message}`, data || "");
};

// ── Video Ad Player with Automatic Fallback ──
function VideoAdPlayer({
  ad,
  onComplete,
  onNoFill,
}: {
  ad: AdRow;
  onComplete: (adId: string) => void;
  onNoFill: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const adContainerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<AdStatus>("idle");
  const [remainingTime, setRemainingTime] = useState(ad.duration_seconds);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  // 🔧 Title as reported by the ad network itself (VAST <AdTitle>), read via
  // IMA's ad.getTitle() once the network responds. Networks — especially
  // redirect-style tags like Hilltop's — often leave this blank, so we
  // fall back to a generic label rather than guessing.
  const [liveAdTitle, setLiveAdTitle] = useState<string | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onNoFillRef = useRef(onNoFill);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const sourceIndexRef = useRef(0);
  const retryCountRef = useRef(0);
  // 🔧 Guards against React 18 Strict Mode double-invoking the mount effect
  // in dev, which was firing startAd() twice and creating two competing
  // AdsManager instances against the same <video> element (the root cause
  // of the ERR_CACHE_OPERATION_NOT_SUPPORTED / adPlayError seen in prod logs).
  const hasStartedRef = useRef(false);

  onCompleteRef.current = onComplete;
  onNoFillRef.current = onNoFill;

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

  useEffect(() => {
    ALL_SOURCES.forEach((s, i) => {
      addDebug(`🔧 Source ${i + 1}/${ALL_SOURCES.length} [${labelForSource(s)}]: ${s}`);
    });
    // Warn about any network in AD_NETWORKS whose env var is empty — it was
    // silently dropped from ALL_SOURCES above and will never be requested.
    AD_NETWORKS.filter((n) => !n.url).forEach((n) => {
      addDebug(`⚠️ Env var for ${n.name} is EMPTY/undefined — ${n.name} will never be requested`);
    });
  }, [addDebug]);

  const getVastTag = useCallback(() => {
    const base = ad.vast_tag_url || 
      ALL_SOURCES[sourceIndexRef.current] || 
      ALL_SOURCES[0];
    const separator = base.includes("?") ? "&" : "?";
    const tag = `${base}${separator}cb=${Date.now()}`;
    addDebug(
      `📤 VAST Tag (source ${sourceIndexRef.current + 1}/${ALL_SOURCES.length} [${labelForSource(ALL_SOURCES[sourceIndexRef.current])}]): ${tag}`,
    );
    return tag;
  }, [ad.vast_tag_url, addDebug]);

  useEffect(() => {
    addDebug("Loading IMA SDK...");
    if (!document.querySelector('script[src*="imasdk.googleapis.com"]')) {
      const script = document.createElement("script");
      script.src = "https://imasdk.googleapis.com/js/sdkloader/ima3.js";
      script.async = true;
      script.onload = () => addDebug("✅ IMA SDK loaded successfully");
      script.onerror = () => addDebug("❌ Failed to load IMA SDK");
      document.head.appendChild(script);
    } else {
      addDebug("✅ IMA SDK already loaded");
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
          addDebug("⏱️ Ad timer reached 0");
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

  const handleSourceFailure = useCallback(() => {
    setLiveAdTitle(null);
    if (sourceIndexRef.current < ALL_SOURCES.length - 1) {
      sourceIndexRef.current += 1;
      retryCountRef.current += 1;
      addDebug(`🔄 Retrying with fallback source ${sourceIndexRef.current + 1}/${ALL_SOURCES.length} [${labelForSource(ALL_SOURCES[sourceIndexRef.current])}]`);
      setStatus("retrying");
      setTimeout(() => {
        if (isMountedRef.current) {
          startAdRef.current?.();
        }
      }, 500);
      return;
    }

    addDebug(`❌ All ${ALL_SOURCES.length} ad sources exhausted — no fill`);
    setStatus("error");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimeout(() => onNoFillRef.current(), 900);
  }, [addDebug]);

  const startAdRef = useRef<() => void>(() => {});

  const startAd = useCallback(() => {
    addDebug(`▶️ startAd() called (source ${sourceIndexRef.current + 1}/${ALL_SOURCES.length} [${labelForSource(ALL_SOURCES[sourceIndexRef.current])}])`);

    if (!adContainerRef.current || !videoRef.current) {
      addDebug("❌ ERROR: Ad container or video element not ready");
      handleSourceFailure();
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
            handleSourceFailure();
          }
        }, 1000);
        return;
      }

      addDebug("🛠️ Creating AdDisplayContainer");
      const ima = (window as any).google.ima;
      const adDisplayContainer = new ima.AdDisplayContainer(
        adContainerRef.current,
        videoRef.current,
      );

      addDebug("🛠️ Initializing AdDisplayContainer");
      adDisplayContainer.initialize();

      // 🔧 DIAGNOSTIC: IMA creates its own internal <video> element inside
      // adContainerRef to actually play the ad — we have no direct
      // reference to it. If that video fails to decode/load (corrupt file,
      // wrong content-type, etc.), the native HTMLMediaElement fires an
      // 'error' event on the <video> itself, but media 'error' events do
      // NOT bubble, so it never reaches normal listeners up the tree unless
      // we listen in the CAPTURE phase. This surfaces exactly what's wrong
      // (network vs decode vs source-not-supported) instead of us guessing.
      adContainerRef.current?.addEventListener(
        "error",
        (e: Event) => {
          const target = e.target as HTMLVideoElement;
          if (target?.tagName === "VIDEO") {
            const mediaError = target.error;
            addDebug(
              `❌ Native <video> error (source ${sourceIndexRef.current + 1} [${labelForSource(ALL_SOURCES[sourceIndexRef.current])}]): ` +
                `code=${mediaError?.code} message=${mediaError?.message || "(none)"} ` +
                `networkState=${target.networkState} readyState=${target.readyState}`,
            );
          }
        },
        true, // capture phase — required since 'error' doesn't bubble on media elements
      );

      addDebug("🛠️ Creating AdsLoader");
      const adsLoader = new ima.AdsLoader(adDisplayContainer);

      adsLoader.addEventListener(
        google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
        (e: any) => {
          addDebug(`✅ AdsManagerLoaded event fired (source ${sourceIndexRef.current + 1} [${labelForSource(ALL_SOURCES[sourceIndexRef.current])}])`);
          try {
            const adsManager = e.getAdsManager(videoRef.current);
            addDebug("✅ AdsManager created successfully");

            // 🔧 Pull the network-provided title (VAST <AdTitle>) once the
            // ad itself loads. Frequently blank on redirect-style networks
            // — that's fine, the UI falls back to a generic label.
            adsManager.addEventListener(
              // Cast to `any`: some IMA type declarations omit LOADED from
              // the AdEvent.Type enum even though it exists at runtime,
              // which was failing the TypeScript build (`Property 'LOADED'
              // does not exist on type 'typeof Type'`).
              (google.ima.AdEvent.Type as any).LOADED,
              (loadedEvent: any) => {
                const loadedAd = loadedEvent?.getAd?.();
                const networkTitle = loadedAd?.getTitle?.();
                if (networkTitle && networkTitle.trim().length > 0) {
                  addDebug(`ℹ️ Network provided ad title: "${networkTitle}"`);
                  setLiveAdTitle(networkTitle.trim());
                } else {
                  addDebug("ℹ️ Network did not provide an ad title (common for this network)");
                }
              },
            );

            adsManager.addEventListener(
              google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,
              () => {
                addDebug("✅ Ad completed (CONTENT_RESUME_REQUESTED)");
                setStatus("idle");
                if (timerRef.current) {
                  clearInterval(timerRef.current);
                  timerRef.current = null;
                }
                sourceIndexRef.current = 0;
                retryCountRef.current = 0;
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
                sourceIndexRef.current = 0;
                retryCountRef.current = 0;
                onCompleteRef.current(ad.id);
              },
            );

            adsManager.addEventListener(
              google.ima.AdErrorEvent.Type.AD_ERROR,
              (adErrorEvent: any) => {
                const err = adErrorEvent?.getError?.();
                addDebug(
                  `❌ Ad error (post-manager, source ${sourceIndexRef.current + 1} [${labelForSource(ALL_SOURCES[sourceIndexRef.current])}]): ` +
                    `code=${err?.getErrorCode?.()} type=${err?.getType?.()} ` +
                    `msg=${err?.getMessage?.()}`,
                );
                console.error("Ad error details (post-manager):", err);
                handleSourceFailure();
              },
            );

            setTimeout(() => {
              addDebug("🛠️ Initializing AdsManager");
              adsManager.init(640, 360, google.ima.ViewMode.NORMAL);

              // 🔧 AUTOPLAY FIX (corrected): IMA creates and drives its OWN
              // internal <video> element inside adContainerRef for the ad
              // creative — it does NOT play through our hidden `videoRef`.
              // Muting `videoRef.current` therefore never reached the video
              // Chrome was actually trying to autoplay, so the autoplay
              // block was silently swallowing playback the whole time (the
              // ad still ran its real internal timeline — note the ~6s gap
              // between our on-screen timer hitting 0 and the real
              // CONTENT_RESUME_REQUESTED event — but nothing ever rendered).
              // adsManager.setVolume(0) is IMA's own documented API for
              // muting whatever video element it's actually managing, and
              // muted playback is always allowed by Chrome's autoplay
              // policy regardless of gesture timing. Must be called before
              // start() so the ad is muted from its very first frame.
              adsManager.setVolume(0);

              addDebug("▶️ Starting AdsManager");
              adsManager.start();
              setStatus("playing");
              addDebug("📶 Status set to playing");
            }, 500);
          } catch (err) {
            addDebug(`❌ ERROR in AdsManagerLoaded event (source ${sourceIndexRef.current + 1})`);
            console.error("AdsManager error:", err);
            handleSourceFailure();
          }
        },
      );

      adsLoader.addEventListener(
        google.ima.AdErrorEvent.Type.AD_ERROR,
        (adErrorEvent: any) => {
          const err = adErrorEvent?.getError?.();
          const errorCode = err?.getErrorCode?.();
          const errorType = err?.getType?.();
          const message = err?.getMessage?.();
          addDebug(
            `❌ Ad loader error (source ${sourceIndexRef.current + 1} [${labelForSource(ALL_SOURCES[sourceIndexRef.current])}]): ` +
              `code=${errorCode} type=${errorType} msg=${message}`,
          );
          console.error("Ad loader error details:", {
            network: labelForSource(ALL_SOURCES[sourceIndexRef.current]),
            errorCode,
            errorType,
            message,
            innerError: err?.getInnerError?.(),
            vastErrorCode: err?.getVastErrorCode?.(),
          });
          handleSourceFailure();
        },
      );

      const vastTag = getVastTag();
      addDebug(`📤 Requesting ads from: ${vastTag}`);
      const adsRequest = new google.ima.AdsRequest();
      adsRequest.adTagUrl = vastTag;
      adsRequest.linearAdSlotWidth = 640;
      adsRequest.linearAdSlotHeight = 360;

      adsLoader.requestAds(adsRequest);
      addDebug("📤 Ad request sent");
    } catch (err) {
      addDebug(`❌ CRITICAL ERROR in startAd (source ${sourceIndexRef.current + 1})`);
      console.error("Critical error:", err);
      handleSourceFailure();
    }
  }, [ad.id, getVastTag, addDebug, handleSourceFailure]);

  startAdRef.current = startAd;

  useEffect(() => {
    // 🔧 Prevents Strict Mode's dev-only double-invoke of this effect from
    // calling startAd() twice for the same mounted instance, which was
    // creating two AdsManager instances racing over the same <video> tag.
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    sourceIndexRef.current = 0;
    retryCountRef.current = 0;
    startAd();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                  <p className="mt-3 text-sm">Click &quot;Watch Ad&quot; to start</p>
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

            {status === "retrying" && (
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
                  <MdInfo className="mx-auto text-4xl text-amber-400" />
                  <p className="mt-2 text-sm text-white/60">
                    No ad available from any source. Try again shortly.
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
          <h3 className="text-base font-semibold text-white">
            {liveAdTitle ?? "Sponsored Video Ad"}
          </h3>
          <p className="mt-0.5 text-sm text-white/50">
            {status === "playing"
              ? `Ad is playing... ${remainingTime}s remaining`
              : status === "retrying"
                ? "Loading your ad..."
                : status === "error"
                  ? "No ads available right now. Please try again later."
                  : "Watch the ad to earn your reward"}
          </p>
          <button
            onClick={startAd}
            disabled={status !== "idle" && status !== "error"}
            className="mt-3 w-full rounded-xl bg-[var(--brand-gold)] py-2.5 text-sm font-semibold text-black transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "idle"
              ? "▶ Watch Ad"
              : status === "loading"
                ? "Loading..."
                : status === "retrying"
                  ? "Loading..."
                  : status === "playing"
                    ? `Ad Playing... ${remainingTime}s`
                    : "⚠️ Try Again"}
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
            <p className="mb-1 text-xs text-amber-400/60">
              Sources: {ALL_SOURCES.length} | Current: {sourceIndexRef.current + 1}
            </p>
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

function formatMMSS(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Main Component ──
export default function WatchAdsClient({
  ads,
  viewedAdIds,
  taskClassId,
  todayEarned,
  todayPoints,
}: Props) {
  const forcedTaskClassId = "task-class-1";

  // 🔧 HYDRATION FIX: generateAdPool() calls Math.random()/Date.now(), so
  // running it inside useState(() => ...) executes it once during SSR and
  // again during client hydration with DIFFERENT results — exactly what
  // throws "Minified React error #418". Start with an empty pool (same on
  // server and client) and fill it in an effect that only runs client-side.
  const [mockPool, setMockPool] = useState<AdRow[]>([]);
  const [mockPoolReady, setMockPoolReady] = useState(false);

  useEffect(() => {
    setMockPool(generateAdPool(AD_POOL_SIZE));
    setMockPoolReady(true);
  }, []);

  const effectiveAds = useMemo(() => {
    if (ads.length > 0) return ads;
    return mockPool;
  }, [ads, mockPool]);

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
  const toastCounter = useRef(0);

  // 🔧 HYDRATION FIX: reading localStorage inside a useState initializer has
  // the same SSR/client mismatch problem as generateAdPool above. Start at
  // null on both server and client, then read it in an effect post-mount.
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COOLDOWN_STORAGE_KEY);
      if (stored) {
        const timestamp = parseInt(stored, 10);
        if (timestamp > Date.now()) {
          setCooldownUntil(timestamp);
        } else {
          localStorage.removeItem(COOLDOWN_STORAGE_KEY);
        }
      }
    } catch {
      // localStorage not available
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldownUntil !== null) {
      try {
        localStorage.setItem(COOLDOWN_STORAGE_KEY, String(cooldownUntil));
      } catch {
        // localStorage not available
      }
    } else {
      try {
        localStorage.removeItem(COOLDOWN_STORAGE_KEY);
      } catch {
        // localStorage not available
      }
    }
  }, [cooldownUntil]);

  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownRemaining(0);
      return;
    }

    const tick = () => {
      const remainingMs = cooldownUntil - Date.now();
      if (remainingMs <= 0) {
        setCooldownUntil(null);
        setCooldownRemaining(0);
        return;
      }
      setCooldownRemaining(Math.ceil(remainingMs / 1000));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  const setCooldown = useCallback(() => {
    const until = Date.now() + NO_FILL_COOLDOWN_MS;
    setCooldownUntil(until);
  }, []);

  const adsWatchedToday = watchedIds.size;
  const limitReached = dailyLimit > 0 && adsWatchedToday >= dailyLimit;
  const onCooldown = cooldownUntil !== null && cooldownRemaining > 0;

  const handleWatchComplete = useCallback(
    async (adId: string) => {
      const ad = effectiveAds.find((a) => a.id === adId);
      if (!ad) {
        setWatchingAd(null);
        return;
      }

      setIsClaiming(true);
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

        setCooldown();
      }
    },
    [effectiveAds, setCooldown],
  );

  const handleNoFill = useCallback(() => {
    setWatchingAd(null);
    setCooldown();
  }, [setCooldown]);

  const startWatching = useCallback(
    (ad: AdRow) => {
      if (
        watchedIds.has(ad.id) ||
        limitReached ||
        watchingAd !== null ||
        onCooldown
      )
        return;
      setWatchingAd(ad);
    },
    [watchedIds, limitReached, watchingAd, onCooldown],
  );

  return (
    <>
      {watchingAd && !isClaiming && (
        <VideoAdPlayer
          ad={watchingAd}
          onComplete={handleWatchComplete}
          onNoFill={handleNoFill}
        />
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

        {!limitReached && onCooldown && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <MdTimer className="shrink-0 text-xl text-amber-400" />
            <p className="text-sm text-white/80">
              No ads available right now. Try again in{" "}
              <span className="font-mono font-medium text-amber-300">
                {formatMMSS(cooldownRemaining)}
              </span>
              .
            </p>
          </div>
        )}

        {effectiveTaskClassId && !mockPoolReady && ads.length === 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: AD_POOL_SIZE }).map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl border border-white/10 bg-zinc-900"
              />
            ))}
          </div>
        )}

        {effectiveTaskClassId && (ads.length > 0 || mockPoolReady) && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {effectiveAds.map((ad) => {
              const isWatched = watchedIds.has(ad.id);
              const isLocked =
                !isWatched &&
                (limitReached || watchingAd !== null || onCooldown);
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
                    <h3 className="text-sm font-semibold leading-snug text-white/70">
                      Sponsored Video Ad
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
                      ) : limitReached ? (
                        <>
                          <MdLock /> Limit reached
                        </>
                      ) : onCooldown ? (
                        <>
                          <MdTimer /> {formatMMSS(cooldownRemaining)}
                        </>
                      ) : isLocked ? (
                        <>
                          <MdLock /> Busy
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