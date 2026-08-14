//  "use client";

// import { useState, useEffect, useRef, useCallback, useMemo } from "react";
// import {
//   MdOndemandVideo,
//   MdPlayArrow,
//   MdCheck,
//   MdLock,
//   MdTimer,
//   MdCheckCircle,
//   MdInfo,
//   MdVolumeUp,
//   MdVolumeOff,
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

// // ── Ad-network sources with automatic fallback ──
// const AD_NETWORKS: { name: string; url: string | undefined }[] = [
//   { name: "HilltopAds", url: process.env.NEXT_PUBLIC_HILLTOPADS_VAST_URL },
//   { name: "ExoClick", url: process.env.NEXT_PUBLIC_EXOCLICK_VAST_URL },
// ];

// const FALLBACK_TAG =
//   "https://s.magsrv.com/v1/vast.php?idz=6000044&ex-av=name";

// const ACTIVE_NETWORKS = AD_NETWORKS.filter(
//   (n): n is { name: string; url: string } => Boolean(n.url),
// );
// const ALL_SOURCES = [...ACTIVE_NETWORKS.map((n) => n.url), FALLBACK_TAG];
// const SOURCE_LABELS = new Map<string, string>([
//   ...ACTIVE_NETWORKS.map((n) => [n.url, n.name] as const),
//   [FALLBACK_TAG, "Static Fallback"],
// ]);

// function labelForSource(url: string): string {
//   return SOURCE_LABELS.get(url) ?? "Unknown";
// }

// const NO_FILL_COOLDOWN_MS = 5 * 60 * 1000;
// const COOLDOWN_STORAGE_KEY = "earnxact_ad_cooldown_until";

// type AdCategory = keyof typeof CATEGORY_COLORS;

// interface AdTemplate {
//   category: AdCategory;
//   rewardType: "cash" | "points";
// }

// const AD_TEMPLATES: AdTemplate[] = [
//   { category: "Finance", rewardType: "cash" },
//   { category: "Finance", rewardType: "points" },
//   { category: "Education", rewardType: "points" },
//   { category: "Shopping", rewardType: "cash" },
//   { category: "Shopping", rewardType: "points" },
//   { category: "Lifestyle", rewardType: "cash" },
//   { category: "Lifestyle", rewardType: "points" },
//   { category: "Energy", rewardType: "cash" },
//   { category: "General", rewardType: "points" },
// ];

// const AD_POOL_SIZE = 6;

// function shuffle<T>(arr: T[]): T[] {
//   const a = [...arr];
//   for (let i = a.length - 1; i > 0; i--) {
//     const j = Math.floor(Math.random() * (i + 1));
//     [a[i], a[j]] = [a[j], a[i]];
//   }
//   return a;
// }

// function randInt(min: number, max: number, step = 5) {
//   const steps = Math.floor((max - min) / step);
//   return min + Math.floor(Math.random() * (steps + 1)) * step;
// }

// function generateAdPool(count: number): AdRow[] {
//   const picks = shuffle(AD_TEMPLATES).slice(0, count);
//   return picks.map((t, i) => {
//     const duration = randInt(15, 45, 5);
//     const reward =
//       t.rewardType === "cash" ? randInt(20, 150, 5) : randInt(20, 150, 10);
//     return {
//       id: `mock-ad-${Date.now()}-${i}`,
//       duration_seconds: duration,
//       category: t.category,
//       reward_type: t.rewardType,
//       reward_amount: reward,
//       vast_tag_url: undefined,
//     } as unknown as AdRow;
//   });
// }

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

// type AdStatus = "idle" | "loading" | "playing" | "error" | "retrying";

// const debugLog = (message: string, data?: any) => {
//   const timestamp = new Date().toISOString();
//   console.log(`[${timestamp}] 📺 AD DEBUG: ${message}`, data || "");
// };

// // ── Promise-based IMA SDK loader ──
// // Ensures we only ever inject/await the script once, and lets callers
// // `await` real readiness instead of guessing with a fixed timeout.
// let imaSdkPromise: Promise<void> | null = null;

// function loadImaSdk(): Promise<void> {
//   if (imaSdkPromise) return imaSdkPromise;

//   imaSdkPromise = new Promise((resolve, reject) => {
//     if (typeof window !== "undefined" && (window as any).google?.ima) {
//       resolve();
//       return;
//     }

//     const existing = document.querySelector(
//       'script[src*="imasdk.googleapis.com"]',
//     ) as HTMLScriptElement | null;

//     if (existing) {
//       // Script tag already present — poll in case it finished loading
//       // before we attached these listeners, and also listen for load/error.
//       const poll = setInterval(() => {
//         if ((window as any).google?.ima) {
//           clearInterval(poll);
//           resolve();
//         }
//       }, 100);
//       existing.addEventListener("load", () => {
//         clearInterval(poll);
//         resolve();
//       });
//       existing.addEventListener("error", () => {
//         clearInterval(poll);
//         reject(new Error("IMA SDK failed to load"));
//       });
//       return;
//     }

//     const script = document.createElement("script");
//     script.src = "https://imasdk.googleapis.com/js/sdkloader/ima3.js";
//     script.async = true;
//     script.onload = () => resolve();
//     script.onerror = () => reject(new Error("IMA SDK failed to load"));
//     document.head.appendChild(script);
//   });

//   return imaSdkPromise;
// }

// // ── Video Ad Player (fixed black screen + responsive) ──
// function VideoAdPlayer({
//   ad,
//   onComplete,
//   onNoFill,
// }: {
//   ad: AdRow;
//   onComplete: (adId: string) => void;
//   onNoFill: () => void;
// }) {
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const adContainerRef = useRef<HTMLDivElement>(null);
//   const [status, setStatus] = useState<AdStatus>("idle");
//   const [remainingTime, setRemainingTime] = useState(ad.duration_seconds);
//   const [debugInfo, setDebugInfo] = useState<string[]>([]);
//   const [liveAdTitle, setLiveAdTitle] = useState<string | null>(null);
//   const [playerSize, setPlayerSize] = useState({ width: 640, height: 360 });
//   const [isMuted, setIsMuted] = useState(true);

//   const onCompleteRef = useRef(onComplete);
//   const onNoFillRef = useRef(onNoFill);
//   const timerRef = useRef<NodeJS.Timeout | null>(null);
//   const isMountedRef = useRef(true);
//   const sourceIndexRef = useRef(0);
//   const retryCountRef = useRef(0);
//   const hasStartedRef = useRef(false);
//   const isMutedRef = useRef(true);

//   const adsManagerRef = useRef<any>(null);
//   const adsLoaderRef = useRef<any>(null);
//   const adDisplayContainerRef = useRef<any>(null);
//   const resizeObserverRef = useRef<ResizeObserver | null>(null);

//   onCompleteRef.current = onComplete;
//   onNoFillRef.current = onNoFill;
//   isMutedRef.current = isMuted;

//   const addDebug = useCallback((message: string) => {
//     debugLog(message);
//     if (isMountedRef.current) {
//       setDebugInfo((prev) => {
//         const newInfo = [
//           ...prev,
//           `${new Date().toLocaleTimeString()}: ${message}`,
//         ];
//         if (newInfo.length > 25) return newInfo.slice(-25);
//         return newInfo;
//       });
//     }
//   }, []);

//   // Measure real container size
//   useEffect(() => {
//     if (!adContainerRef.current) return;

//     const updateSize = () => {
//       const el = adContainerRef.current;
//       if (!el) return;
//       const width = Math.max(el.clientWidth || 320, 320);
//       const height = Math.max(el.clientHeight || Math.round(width * (9 / 16)), 180);
//       setPlayerSize({ width, height });
//     };

//     updateSize();

//     resizeObserverRef.current = new ResizeObserver(updateSize);
//     resizeObserverRef.current.observe(adContainerRef.current);

//     window.addEventListener("orientationchange", updateSize);
//     window.addEventListener("resize", updateSize);

//     return () => {
//       resizeObserverRef.current?.disconnect();
//       window.removeEventListener("orientationchange", updateSize);
//       window.removeEventListener("resize", updateSize);
//     };
//   }, []);

//   // Resize AdsManager when container size changes
//   useEffect(() => {
//     if (adsManagerRef.current && status === "playing") {
//       try {
//         adsManagerRef.current.resize(
//           playerSize.width,
//           playerSize.height,
//           google.ima.ViewMode.NORMAL,
//         );
//         addDebug(`Resized AdsManager → ${playerSize.width}×${playerSize.height}`);
//       } catch {}
//     }
//   }, [playerSize, status, addDebug]);

//   const destroyAds = useCallback(() => {
//     try {
//       adsManagerRef.current?.destroy();
//     } catch {}
//     try {
//       adsLoaderRef.current?.contentComplete?.();
//       adsLoaderRef.current?.destroy();
//     } catch {}
//     adsManagerRef.current = null;
//     adsLoaderRef.current = null;
//     adDisplayContainerRef.current = null;
//   }, []);

//   useEffect(() => {
//     isMountedRef.current = true;
//     return () => {
//       isMountedRef.current = false;
//       if (timerRef.current) {
//         clearInterval(timerRef.current);
//         timerRef.current = null;
//       }
//       destroyAds();
//     };
//   }, [destroyAds]);

//   useEffect(() => {
//     ALL_SOURCES.forEach((s, i) => {
//       addDebug(
//         `🔧 Source ${i + 1}/${ALL_SOURCES.length} [${labelForSource(s)}]: ${s}`,
//       );
//     });
//     AD_NETWORKS.filter((n) => !n.url).forEach((n) => {
//       addDebug(
//         `⚠️ Env var for ${n.name} is EMPTY/undefined — ${n.name} will never be requested`,
//       );
//     });
//   }, [addDebug]);

//   const getVastTag = useCallback(() => {
//     const base =
//       ad.vast_tag_url ||
//       ALL_SOURCES[sourceIndexRef.current] ||
//       ALL_SOURCES[0];
//     const separator = base.includes("?") ? "&" : "?";
//     const tag = `${base}${separator}cb=${Date.now()}`;
//     addDebug(
//       `📤 VAST Tag (source ${sourceIndexRef.current + 1}/${ALL_SOURCES.length} [${labelForSource(ALL_SOURCES[sourceIndexRef.current])}]): ${tag}`,
//     );
//     return tag;
//   }, [ad.vast_tag_url, addDebug]);

//   // Kick off IMA SDK loading as soon as the player mounts, so it's likely
//   // ready (or close to it) by the time startAd() actually needs it.
//   useEffect(() => {
//     addDebug("Loading IMA SDK...");
//     loadImaSdk()
//       .then(() => addDebug("✅ IMA SDK loaded successfully"))
//       .catch(() => addDebug("❌ Failed to load IMA SDK"));
//   }, [addDebug]);

//   // Countdown (prefers real remaining time from IMA)
//   useEffect(() => {
//     if (status !== "playing") {
//       if (timerRef.current) {
//         clearInterval(timerRef.current);
//         timerRef.current = null;
//       }
//       return;
//     }

//     timerRef.current = setInterval(() => {
//       if (adsManagerRef.current) {
//         try {
//           const real = adsManagerRef.current.getRemainingTime();
//           if (typeof real === "number" && isFinite(real) && real >= 0) {
//             setRemainingTime(Math.ceil(real));
//             return;
//           }
//         } catch {}
//       }

//       setRemainingTime((prev) => {
//         if (prev <= 1) {
//           clearInterval(timerRef.current!);
//           timerRef.current = null;
//           addDebug("⏱️ Fallback timer reached 0");
//           return 0;
//         }
//         return prev - 1;
//       });
//     }, 400);

//     return () => {
//       if (timerRef.current) {
//         clearInterval(timerRef.current);
//         timerRef.current = null;
//       }
//     };
//   }, [status, addDebug]);

//   // Force play any video IMA injects (fixes black screen)
//   const forcePlayInternalVideos = useCallback(() => {
//     if (!adContainerRef.current) return;

//     const videos = adContainerRef.current.querySelectorAll("video");
//     addDebug(`🔍 forcePlayInternalVideos: found ${videos.length} <video> el(s)`);

//     videos.forEach((video, idx) => {
//       try {
//         // Skip placeholder video elements IMA hasn't assigned a source to yet —
//         // forcing play()/sizing on these does nothing useful and can interfere
//         // with IMA's own bookkeeping once it does assign a source.
//         if (!video.currentSrc && !video.src) return;

//         if (!video.dataset.diagAttached) {
//           video.dataset.diagAttached = "true";

//           addDebug(
//             `🔍 video[${idx}] src=${video.currentSrc || video.src || "(none)"} ` +
//               `readyState=${video.readyState} networkState=${video.networkState} ` +
//               `paused=${video.paused} muted=${video.muted}`,
//           );

//           video.addEventListener("error", () => {
//             const err = video.error;
//             addDebug(
//               `❌ video[${idx}] error event: code=${err?.code} message=${err?.message || "(none)"} ` +
//                 `networkState=${video.networkState} readyState=${video.readyState}`,
//             );
//           });
//           video.addEventListener("stalled", () =>
//             addDebug(`⚠️ video[${idx}] stalled (network stalled while fetching)`),
//           );
//           video.addEventListener("waiting", () =>
//             addDebug(`⚠️ video[${idx}] waiting (buffering, not enough data)`),
//           );
//           video.addEventListener("loadedmetadata", () =>
//             addDebug(
//               `ℹ️ video[${idx}] loadedmetadata: ${video.videoWidth}×${video.videoHeight}, duration=${video.duration}`,
//             ),
//           );
//           video.addEventListener("playing", () =>
//             addDebug(`✅ video[${idx}] playing event fired (frame is actually rendering)`),
//           );
//         }

//         // IMA already manages this video's playback, sizing, and positioning
//         // in lockstep with its own overlay UI (click layer, play/pause button,
//         // skip button). Only step in if IMA's own playback has genuinely
//         // stalled — forcing play()/width/height unconditionally here fights
//         // IMA's UI layer and is what produces a black frame with a stuck
//         // play/pause icon even while the video is technically decoding fine.
//         if (video.paused) {
//           addDebug(`⚠️ video[${idx}] is paused — nudging playback as a fallback`);
//           video.muted = true;
//           video.playsInline = true;
//           video.setAttribute("playsinline", "true");
//           video.setAttribute("webkit-playsinline", "true");
//           video
//             .play()
//             .then(() => addDebug(`✅ video[${idx}] fallback play() resolved`))
//             .catch((err) =>
//               addDebug(`❌ video[${idx}] fallback play() REJECTED: ${err?.name || err}: ${err?.message || ""}`),
//             );
//         }
//       } catch (err) {
//         addDebug(`❌ video[${idx}] forcePlayInternalVideos threw: ${err}`);
//       }
//     });
//   }, [addDebug]);

//   const toggleMute = useCallback(() => {
//     const next = !isMutedRef.current;
//     isMutedRef.current = next;
//     setIsMuted(next);

//     try {
//       adsManagerRef.current?.setVolume(next ? 0 : 1);
//     } catch {}

//     if (adContainerRef.current) {
//       adContainerRef.current.querySelectorAll("video").forEach((v) => {
//         try {
//           v.muted = next;
//           if (!next) v.volume = 1;
//         } catch {}
//       });
//     }

//     addDebug(`🔊 Mute toggled → ${next ? "muted" : "unmuted"}`);
//   }, [addDebug]);

//   const handleSourceFailure = useCallback(() => {
//     setLiveAdTitle(null);
//     destroyAds();

//     if (sourceIndexRef.current < ALL_SOURCES.length - 1) {
//       sourceIndexRef.current += 1;
//       retryCountRef.current += 1;
//       addDebug(
//         `🔄 Retrying with fallback source ${sourceIndexRef.current + 1}/${ALL_SOURCES.length} [${labelForSource(ALL_SOURCES[sourceIndexRef.current])}]`,
//       );
//       setStatus("retrying");
//       setTimeout(() => {
//         if (isMountedRef.current) {
//           startAdRef.current?.();
//         }
//       }, 600);
//       return;
//     }

//     addDebug(`❌ All ${ALL_SOURCES.length} ad sources exhausted — no fill`);
//     setStatus("error");
//     if (timerRef.current) {
//       clearInterval(timerRef.current);
//       timerRef.current = null;
//     }
//     setTimeout(() => onNoFillRef.current(), 900);
//   }, [addDebug, destroyAds]);

//   const startAdRef = useRef<() => void>(() => {});

//   const startAd = useCallback(async () => {
//     addDebug(
//       `▶️ startAd() called (source ${sourceIndexRef.current + 1}/${ALL_SOURCES.length} [${labelForSource(ALL_SOURCES[sourceIndexRef.current])}])`,
//     );

//     if (!adContainerRef.current || !videoRef.current) {
//       addDebug("❌ ERROR: Ad container or video element not ready");
//       handleSourceFailure();
//       return;
//     }

//     destroyAds();

//     setStatus("loading");
//     setLiveAdTitle(null);
//     setRemainingTime(ad.duration_seconds);
//     isMutedRef.current = true;
//     setIsMuted(true);
//     addDebug("📶 Status set to loading");

//     try {
//       if (typeof google === "undefined" || !google.ima) {
//         addDebug("⏳ Ensuring IMA SDK is ready...");
//         try {
//           await loadImaSdk();
//           addDebug("✅ IMA SDK ready");
//         } catch {
//           addDebug("❌ ERROR: IMA SDK failed to load");
//           handleSourceFailure();
//           return;
//         }
//       }

//       // Bail out if the component unmounted or a newer startAd() call
//       // (e.g. from a fallback retry) took over while we were waiting.
//       if (!isMountedRef.current) return;

//       try {
//         (google.ima as any).settings.setDisableCustomPlaybackForIOS10Plus(true);
//         (google.ima as any).settings.setNumRedirects(8);
//       } catch {}

//       const ima = (window as any).google.ima;

//       addDebug("🛠️ Creating AdDisplayContainer");
//       const adDisplayContainer = new ima.AdDisplayContainer(
//         adContainerRef.current,
//         videoRef.current,
//       );
//       adDisplayContainerRef.current = adDisplayContainer;

//       addDebug("🛠️ Initializing AdDisplayContainer");
//       adDisplayContainer.initialize();

//       adContainerRef.current?.addEventListener(
//         "error",
//         (e: Event) => {
//           const target = e.target as HTMLVideoElement;
//           if (target?.tagName === "VIDEO") {
//             const mediaError = target.error;
//             addDebug(
//               `❌ Native <video> error (source ${sourceIndexRef.current + 1} [${labelForSource(ALL_SOURCES[sourceIndexRef.current])}]): ` +
//                 `code=${mediaError?.code} message=${mediaError?.message || "(none)"} ` +
//                 `networkState=${target.networkState} readyState=${target.readyState}`,
//             );
//           }
//         },
//         true,
//       );

//       addDebug("🛠️ Creating AdsLoader");
//       const adsLoader = new ima.AdsLoader(adDisplayContainer);
//       adsLoaderRef.current = adsLoader;

//       adsLoader.addEventListener(
//         google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
//         (e: any) => {
//           addDebug(
//             `✅ AdsManagerLoaded event fired (source ${sourceIndexRef.current + 1} [${labelForSource(ALL_SOURCES[sourceIndexRef.current])}])`,
//           );
//           try {
//             const adsManager = e.getAdsManager(videoRef.current);
//             adsManagerRef.current = adsManager;
//             addDebug("✅ AdsManager created successfully");

//             adsManager.addEventListener(
//               (google.ima.AdEvent.Type as any).LOADED,
//               (loadedEvent: any) => {
//                 const loadedAd = loadedEvent?.getAd?.();
//                 const duration = loadedAd?.getDuration?.();
//                 if (
//                   typeof duration === "number" &&
//                   duration > 0 &&
//                   isFinite(duration)
//                 ) {
//                   const secs = Math.ceil(duration);
//                   setRemainingTime(secs);
//                   addDebug(`ℹ️ Real ad duration from network: ${secs}s`);
//                 }
//                 const networkTitle = loadedAd?.getTitle?.();
//                 if (networkTitle && networkTitle.trim().length > 0) {
//                   addDebug(`ℹ️ Network provided ad title: "${networkTitle}"`);
//                   setLiveAdTitle(networkTitle.trim());
//                 } else {
//                   addDebug("ℹ️ Network did not provide an ad title");
//                 }
//               },
//             );

//             adsManager.addEventListener(
//               google.ima.AdEvent.Type.STARTED,
//               () => {
//                 addDebug("▶️ Ad STARTED");
//                 setStatus("playing");
//                 forcePlayInternalVideos();
//                 // Retry a couple of times – some creatives need it
//                 setTimeout(forcePlayInternalVideos, 300);
//                 setTimeout(forcePlayInternalVideos, 800);
//               },
//             );

//             const finishAd = () => {
//               addDebug("✅ Ad completed");
//               setStatus("idle");
//               if (timerRef.current) {
//                 clearInterval(timerRef.current);
//                 timerRef.current = null;
//               }
//               sourceIndexRef.current = 0;
//               retryCountRef.current = 0;
//               destroyAds();
//               onCompleteRef.current(ad.id);
//             };

//             adsManager.addEventListener(
//               google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,
//               finishAd,
//             );
//             adsManager.addEventListener(
//               google.ima.AdEvent.Type.COMPLETE,
//               finishAd,
//             );

//             adsManager.addEventListener(
//               google.ima.AdErrorEvent.Type.AD_ERROR,
//               (adErrorEvent: any) => {
//                 const err = adErrorEvent?.getError?.();
//                 addDebug(
//                   `❌ Ad error (post-manager, source ${sourceIndexRef.current + 1} [${labelForSource(ALL_SOURCES[sourceIndexRef.current])}]): ` +
//                     `code=${err?.getErrorCode?.()} type=${err?.getType?.()} ` +
//                     `msg=${err?.getMessage?.()}`,
//                 );
//                 console.error("Ad error details (post-manager):", err);
//                 handleSourceFailure();
//               },
//             );

//             // Force fresh measurement right before init
//             const el = adContainerRef.current;
//             const width = el ? Math.max(el.clientWidth, 320) : 640;
//             const height = el
//               ? Math.max(el.clientHeight, Math.round(width * 9 / 16))
//               : 360;

//             addDebug(`🛠️ Initializing AdsManager at ${width}×${height}`);

//             try {
//               adsManager.init(width, height, google.ima.ViewMode.NORMAL);
//               adsManager.setVolume(isMutedRef.current ? 0 : 1);

//               // Small delay helps some networks finish setting up the video element
//               setTimeout(() => {
//                 try {
//                   adsManager.start();
//                   addDebug("▶️ Starting AdsManager");
//                 } catch (err) {
//                   addDebug("❌ adsManager.start() failed");
//                   console.error(err);
//                   handleSourceFailure();
//                 }
//               }, 150);
//             } catch (err) {
//               addDebug("❌ adsManager.init() failed");
//               console.error(err);
//               handleSourceFailure();
//             }
//           } catch (err) {
//             addDebug(
//               `❌ ERROR in AdsManagerLoaded event (source ${sourceIndexRef.current + 1})`,
//             );
//             console.error("AdsManager error:", err);
//             handleSourceFailure();
//           }
//         },
//       );

//       adsLoader.addEventListener(
//         google.ima.AdErrorEvent.Type.AD_ERROR,
//         (adErrorEvent: any) => {
//           const err = adErrorEvent?.getError?.();
//           const errorCode = err?.getErrorCode?.();
//           const errorType = err?.getType?.();
//           const message = err?.getMessage?.();
//           addDebug(
//             `❌ Ad loader error (source ${sourceIndexRef.current + 1} [${labelForSource(ALL_SOURCES[sourceIndexRef.current])}]): ` +
//               `code=${errorCode} type=${errorType} msg=${message}`,
//           );
//           console.error("Ad loader error details:", {
//             network: labelForSource(ALL_SOURCES[sourceIndexRef.current]),
//             errorCode,
//             errorType,
//             message,
//             innerError: err?.getInnerError?.(),
//             vastErrorCode: err?.getVastErrorCode?.(),
//           });
//           handleSourceFailure();
//         },
//       );

//       const vastTag = getVastTag();
//       addDebug(`📤 Requesting ads from: ${vastTag}`);
//       const adsRequest = new google.ima.AdsRequest();
//       adsRequest.adTagUrl = vastTag;
//       adsRequest.linearAdSlotWidth = playerSize.width;
//       adsRequest.linearAdSlotHeight = playerSize.height;

//       try {
//         (adsRequest as any).setAdWillAutoPlay(true);
//         (adsRequest as any).setAdWillPlayMuted(true);
//       } catch {}

//       adsLoader.requestAds(adsRequest);
//       addDebug("📤 Ad request sent");
//     } catch (err) {
//       addDebug(
//         `❌ CRITICAL ERROR in startAd (source ${sourceIndexRef.current + 1})`,
//       );
//       console.error("Critical error:", err);
//       handleSourceFailure();
//     }
//   }, [
//     ad.id,
//     ad.duration_seconds,
//     getVastTag,
//     addDebug,
//     handleSourceFailure,
//     destroyAds,
//     playerSize,
//     forcePlayInternalVideos,
//   ]);

//   startAdRef.current = startAd;

//   useEffect(() => {
//     if (hasStartedRef.current) return;
//     hasStartedRef.current = true;

//     sourceIndexRef.current = 0;
//     retryCountRef.current = 0;
//     startAd();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   const visualProgress = Math.min(
//     100,
//     Math.max(
//       0,
//       100 - (remainingTime / Math.max(ad.duration_seconds, 1)) * 100,
//     ),
//   );

//   return (
//     <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/90 p-0 sm:p-4 backdrop-blur-sm">
//       <div className="relative w-full max-w-3xl max-h-[96vh] overflow-hidden rounded-t-2xl sm:rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl">
//         <div className="relative">
//           <div
//             ref={adContainerRef}
//             className="ad-container relative w-full bg-black overflow-hidden h-[50vh] sm:h-auto sm:aspect-video max-h-[70vh]"
//             style={{ minHeight: 200 }}
//           >
//             {status === "idle" && (
//               <div className="absolute inset-0 flex items-center justify-center">
//                 <div className="text-center text-white/50">
//                   <MdOndemandVideo className="mx-auto text-5xl" />
//                   <p className="mt-3 text-sm">Click &quot;Watch Ad&quot; to start</p>
//                 </div>
//               </div>
//             )}

//             {(status === "loading" || status === "retrying") && (
//               <div className="absolute inset-0 flex items-center justify-center bg-black/60">
//                 <div className="text-center">
//                   <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-[var(--brand-gold)]" />
//                   <p className="mt-3 text-sm text-white/60">
//                     {status === "retrying"
//                       ? "Trying another network..."
//                       : "Loading ad..."}
//                   </p>
//                 </div>
//               </div>
//             )}

//             {status === "error" && (
//               <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
//                 <div className="px-6 text-center">
//                   <MdInfo className="mx-auto text-4xl text-amber-400" />
//                   <p className="mt-2 text-sm text-white/70">
//                     No ad available from any source right now.
//                   </p>
//                 </div>
//               </div>
//             )}
//           </div>

//           <video
//             ref={videoRef}
//             className="hidden"
//             playsInline
//             muted
//             // @ts-ignore
//             webkit-playsinline="true"
//           />

//           {status === "playing" && (
//             <div className="absolute bottom-0 left-0 right-0 z-10">
//               <div className="h-1.5 bg-black/50">
//                 <div
//                   className="h-full bg-[var(--brand-gold)] transition-all duration-300"
//                   style={{ width: `${visualProgress}%` }}
//                 />
//               </div>
//             </div>
//           )}

//           <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2">
//             <span className="rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white">
//               {ad.category}
//             </span>
//             {status === "playing" && (
//               <span className="flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white">
//                 <MdTimer className="text-sm" />
//                 {remainingTime}s
//               </span>
//             )}
//           </div>

//           <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold">
//             <span
//               className={
//                 ad.reward_type === "cash"
//                   ? "text-[var(--brand-gold)]"
//                   : "text-violet-400"
//               }
//             >
//               +
//               {ad.reward_type === "cash"
//                 ? formatCurrency(ad.reward_amount)
//                 : `${Math.round(ad.reward_amount)} pts`}
//             </span>
//           </div>

//           {status === "playing" && (
//             <button
//               type="button"
//               onClick={toggleMute}
//               aria-label={isMuted ? "Unmute ad" : "Mute ad"}
//               className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/85 active:scale-95"
//             >
//               {isMuted ? (
//                 <>
//                   <MdVolumeOff className="text-base" /> Tap for sound
//                 </>
//               ) : (
//                 <MdVolumeUp className="text-base" />
//               )}
//             </button>
//           )}

//           {process.env.NODE_ENV === "development" && (
//             <button
//               onClick={() => {
//                 const debugSection = document.getElementById("debug-info");
//                 if (debugSection) debugSection.classList.toggle("hidden");
//               }}
//               className="absolute bottom-3 right-3 z-20 rounded-full bg-black/50 p-1.5 text-xs text-white/40 hover:bg-black/70 hover:text-white/80"
//             >
//               <MdInfo className="text-lg" />
//             </button>
//           )}
//         </div>

//         <div className="p-4 sm:p-5">
//           <h3 className="text-base font-semibold text-white truncate">
//             {liveAdTitle ?? "Sponsored Video Ad"}
//           </h3>
//           <p className="mt-0.5 text-sm text-white/50">
//             {status === "playing"
//               ? `Ad is playing... ${remainingTime}s remaining`
//               : status === "retrying"
//                 ? "Loading next network..."
//                 : status === "error"
//                   ? "No ads available right now. Please try again later."
//                   : "Watch the ad to earn your reward"}
//           </p>

//           <button
//             onClick={startAd}
//             disabled={status !== "idle" && status !== "error"}
//             className="mt-4 w-full rounded-xl bg-[var(--brand-gold)] py-3 text-sm font-semibold text-black transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
//           >
//             {status === "idle"
//               ? "▶ Watch Ad"
//               : status === "loading"
//                 ? "Loading..."
//                 : status === "retrying"
//                   ? "Loading..."
//                   : status === "playing"
//                     ? `Ad Playing... ${remainingTime}s`
//                     : "⚠️ Try Again"}
//           </button>

//           <p className="mt-2.5 text-center text-[11px] text-white/30">
//             Do not close this window. Reward will be credited automatically.
//           </p>
//         </div>

//         {process.env.NODE_ENV === "development" && (
//           <div
//             id="debug-info"
//             className="hidden border-t border-white/10 bg-black/60 p-3 text-xs font-mono text-white/60 max-h-48 overflow-y-auto"
//           >
//             <p className="mb-1 font-semibold text-white/80">🐛 Debug Log:</p>
//             <p className="mb-1 text-xs text-amber-400/70">
//               Sources: {ALL_SOURCES.length} | Current:{" "}
//               {sourceIndexRef.current + 1} | Size: {playerSize.width}×
//               {playerSize.height}
//             </p>
//             {debugInfo.map((msg, i) => (
//               <p key={i} className="py-0.5 border-b border-white/5">
//                 {msg}
//               </p>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// function formatMMSS(totalSeconds: number) {
//   const m = Math.floor(totalSeconds / 60);
//   const s = totalSeconds % 60;
//   return `${m}:${s.toString().padStart(2, "0")}`;
// }

// // ── Main Component ──
// export default function WatchAdsClient({
//   ads,
//   viewedAdIds,
//   taskClassId,
//   todayEarned,
//   todayPoints,
// }: Props) {
//   const forcedTaskClassId = "task-class-1";

//   const [mockPool, setMockPool] = useState<AdRow[]>([]);
//   const [mockPoolReady, setMockPoolReady] = useState(false);

//   useEffect(() => {
//     setMockPool(generateAdPool(AD_POOL_SIZE));
//     setMockPoolReady(true);
//   }, []);

//   const effectiveAds = useMemo(() => {
//     if (ads.length > 0) return ads;
//     return mockPool;
//   }, [ads, mockPool]);

//   const effectiveTaskClassId = forcedTaskClassId;
//   const effectiveTodayEarned = todayEarned;
//   const effectiveTodayPoints = todayPoints;
//   const effectiveViewedAds = viewedAdIds;

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
//   const toastCounter = useRef(0);

//   const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
//   const [cooldownRemaining, setCooldownRemaining] = useState(0);

//   useEffect(() => {
//     try {
//       const stored = localStorage.getItem(COOLDOWN_STORAGE_KEY);
//       if (stored) {
//         const timestamp = parseInt(stored, 10);
//         if (timestamp > Date.now()) {
//           setCooldownUntil(timestamp);
//         } else {
//           localStorage.removeItem(COOLDOWN_STORAGE_KEY);
//         }
//       }
//     } catch {
//       // localStorage not available
//     }
//   }, []);

//   useEffect(() => {
//     if (cooldownUntil !== null) {
//       try {
//         localStorage.setItem(COOLDOWN_STORAGE_KEY, String(cooldownUntil));
//       } catch {}
//     } else {
//       try {
//         localStorage.removeItem(COOLDOWN_STORAGE_KEY);
//       } catch {}
//     }
//   }, [cooldownUntil]);

//   useEffect(() => {
//     if (!cooldownUntil) {
//       setCooldownRemaining(0);
//       return;
//     }

//     const tick = () => {
//       const remainingMs = cooldownUntil - Date.now();
//       if (remainingMs <= 0) {
//         setCooldownUntil(null);
//         setCooldownRemaining(0);
//         return;
//       }
//       setCooldownRemaining(Math.ceil(remainingMs / 1000));
//     };

//     tick();
//     const interval = setInterval(tick, 1000);
//     return () => clearInterval(interval);
//   }, [cooldownUntil]);

//   const setCooldown = useCallback(() => {
//     const until = Date.now() + NO_FILL_COOLDOWN_MS;
//     setCooldownUntil(until);
//   }, []);

//   const adsWatchedToday = watchedIds.size;
//   const limitReached = dailyLimit > 0 && adsWatchedToday >= dailyLimit;
//   const onCooldown = cooldownUntil !== null && cooldownRemaining > 0;

//   const handleWatchComplete = useCallback(
//     async (adId: string) => {
//       const ad = effectiveAds.find((a) => a.id === adId);
//       if (!ad) {
//         setWatchingAd(null);
//         return;
//       }

//       setIsClaiming(true);
//       const result = { success: true }; // replace with real claimAdReward later
//       setIsClaiming(false);
//       setWatchingAd(null);

//       if (result.success) {
//         setWatchedIds((prev) => new Set([...prev, adId]));
//         if (ad.reward_type === "cash")
//           setEarnedToday((prev) => prev + ad.reward_amount);
//         else setPointsToday((prev) => prev + Math.round(ad.reward_amount));

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

//         setCooldown();
//       }
//     },
//     [effectiveAds, setCooldown],
//   );

//   const handleNoFill = useCallback(() => {
//     setWatchingAd(null);
//     setCooldown();
//   }, [setCooldown]);

//   const startWatching = useCallback(
//     (ad: AdRow) => {
//       if (
//         watchedIds.has(ad.id) ||
//         limitReached ||
//         watchingAd !== null ||
//         onCooldown
//       )
//         return;
//       setWatchingAd(ad);
//     },
//     [watchedIds, limitReached, watchingAd, onCooldown],
//   );

//   return (
//     <>
//       {watchingAd && !isClaiming && (
//         <VideoAdPlayer
//           ad={watchingAd}
//           onComplete={handleWatchComplete}
//           onNoFill={handleNoFill}
//         />
//       )}
//       {isClaiming && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
//           <div className="flex flex-col items-center gap-3">
//             <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[var(--brand-gold)]" />
//             <p className="text-sm text-white/60">Crediting your reward…</p>
//           </div>
//         </div>
//       )}
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
//         <div>
//           <h1 className="text-2xl font-bold text-white md:text-3xl">
//             Watch Ads
//           </h1>
//           <p className="mt-1 text-sm text-white/50">
//             Watch short video ads and earn cash or points instantly.
//           </p>
//         </div>

//         {effectiveTaskClassId && (
//           <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
//             <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
//               <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
//                 Cash Earned Today
//               </p>
//               <p className="mt-1 text-2xl font-bold text-[var(--brand-gold)]">
//                 {formatCurrency(earnedToday)}
//               </p>
//               <p className="mt-2 text-xs text-white/40">Credited to wallet</p>
//             </div>
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

//         {effectiveTaskClassId && limitReached && (
//           <div className="flex items-center gap-3 rounded-xl border border-[var(--brand-gold)]/20 bg-[var(--brand-gold)]/5 px-4 py-3">
//             <MdInfo className="shrink-0 text-xl text-[var(--brand-gold)]" />
//             <p className="text-sm text-white/80">
//               You&apos;ve reached your daily limit of{" "}
//               <span className="font-medium">{dailyLimit} ads</span>. Limits
//               reset at midnight UTC.
//             </p>
//           </div>
//         )}

//         {!limitReached && onCooldown && (
//           <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
//             <MdTimer className="shrink-0 text-xl text-amber-400" />
//             <p className="text-sm text-white/80">
//               No ads available right now. Try again in{" "}
//               <span className="font-mono font-medium text-amber-300">
//                 {formatMMSS(cooldownRemaining)}
//               </span>
//               .
//             </p>
//           </div>
//         )}

//         {effectiveTaskClassId && !mockPoolReady && ads.length === 0 && (
//           <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
//             {Array.from({ length: AD_POOL_SIZE }).map((_, i) => (
//               <div
//                 key={i}
//                 className="h-64 animate-pulse rounded-2xl border border-white/10 bg-zinc-900"
//               />
//             ))}
//           </div>
//         )}

//         {effectiveTaskClassId && (ads.length > 0 || mockPoolReady) && (
//           <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
//             {effectiveAds.map((ad) => {
//               const isWatched = watchedIds.has(ad.id);
//               const isLocked =
//                 !isWatched &&
//                 (limitReached || watchingAd !== null || onCooldown);
//               const catColor =
//                 CATEGORY_COLORS[ad.category] ?? CATEGORY_COLORS.General;
//               const gradient =
//                 CATEGORY_GRADIENTS[ad.category] ?? CATEGORY_GRADIENTS.General;

//               return (
//                 <div
//                   key={ad.id}
//                   className={`overflow-hidden rounded-2xl border bg-zinc-900 transition-all ${isWatched ? "border-green-500/20" : "border-white/10"}`}
//                 >
//                   <div
//                     className={`relative flex h-32 items-center justify-center bg-gradient-to-br ${gradient}`}
//                   >
//                     <MdOndemandVideo className="text-4xl text-white/20" />
//                     {isWatched && (
//                       <div className="absolute inset-0 flex items-center justify-center bg-black/40">
//                         <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-green-400 bg-green-400/20">
//                           <MdCheck className="text-xl text-green-400" />
//                         </div>
//                       </div>
//                     )}
//                     <span
//                       className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${catColor}`}
//                     >
//                       {ad.category}
//                     </span>
//                     <span
//                       className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${ad.reward_type === "cash" ? "bg-[var(--brand-gold)]/20 text-[var(--brand-gold)]" : "bg-violet-500/20 text-violet-400"}`}
//                     >
//                       {ad.reward_type === "cash" ? "Cash" : "Points"}
//                     </span>
//                   </div>
//                   <div className="p-4">
//                     <h3 className="text-sm font-semibold leading-snug text-white/70">
//                       Sponsored Video Ad
//                     </h3>
//                     <div className="mt-1 flex items-center gap-1 text-xs text-white/40">
//                       <MdTimer className="text-sm" />
//                       {ad.duration_seconds}s
//                     </div>
//                     <p
//                       className={`mt-2 text-lg font-bold ${ad.reward_type === "cash" ? "text-[var(--brand-gold)]" : "text-violet-400"}`}
//                     >
//                       {ad.reward_type === "cash"
//                         ? `+${formatCurrency(ad.reward_amount)}`
//                         : `+${Math.round(ad.reward_amount)} pts`}
//                     </p>
//                     <button
//                       type="button"
//                       onClick={() => startWatching(ad)}
//                       disabled={isWatched || isLocked}
//                       className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-all ${isWatched ? "cursor-default bg-green-500/10 text-green-400" : isLocked ? "cursor-not-allowed bg-white/5 text-white/25" : "bg-[var(--brand-gold)] text-black hover:brightness-110 active:scale-95"}`}
//                     >
//                       {isWatched ? (
//                         <>
//                           <MdCheck /> Watched
//                         </>
//                       ) : limitReached ? (
//                         <>
//                           <MdLock /> Limit reached
//                         </>
//                       ) : onCooldown ? (
//                         <>
//                           <MdTimer /> {formatMMSS(cooldownRemaining)}
//                         </>
//                       ) : isLocked ? (
//                         <>
//                           <MdLock /> Busy
//                         </>
//                       ) : (
//                         <>
//                           <MdPlayArrow /> Watch
//                         </>
//                       )}
//                     </button>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>
//     </>
//   );
// }



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
  MdVolumeUp,
  MdVolumeOff,
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
const AD_NETWORKS: { name: string; url: string | undefined }[] = [
  { name: "HilltopAds", url: process.env.NEXT_PUBLIC_HILLTOPADS_VAST_URL },
  { name: "ExoClick", url: process.env.NEXT_PUBLIC_EXOCLICK_VAST_URL },
];

const FALLBACK_TAG =
  "https://s.magsrv.com/v1/vast.php?idz=6000044&ex-av=name";

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

// ── Promise-based IMA SDK loader ──
// Ensures we only ever inject/await the script once, and lets callers
// `await` real readiness instead of guessing with a fixed timeout.
let imaSdkPromise: Promise<void> | null = null;

function loadImaSdk(): Promise<void> {
  if (imaSdkPromise) return imaSdkPromise;

  imaSdkPromise = new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && (window as any).google?.ima) {
      resolve();
      return;
    }

    const existing = document.querySelector(
      'script[src*="imasdk.googleapis.com"]',
    ) as HTMLScriptElement | null;

    if (existing) {
      // Script tag already present — poll in case it finished loading
      // before we attached these listeners, and also listen for load/error.
      const poll = setInterval(() => {
        if ((window as any).google?.ima) {
          clearInterval(poll);
          resolve();
        }
      }, 100);
      existing.addEventListener("load", () => {
        clearInterval(poll);
        resolve();
      });
      existing.addEventListener("error", () => {
        clearInterval(poll);
        reject(new Error("IMA SDK failed to load"));
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://imasdk.googleapis.com/js/sdkloader/ima3.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("IMA SDK failed to load"));
    document.head.appendChild(script);
  });

  return imaSdkPromise;
}

// ── Video Ad Player (fixed black screen + responsive + autoplay-safe) ──
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
  const [liveAdTitle, setLiveAdTitle] = useState<string | null>(null);
  const [playerSize, setPlayerSize] = useState({ width: 640, height: 360 });
  const [isMuted, setIsMuted] = useState(true);
  const [showManualPlay, setShowManualPlay] = useState(false);

  const onCompleteRef = useRef(onComplete);
  const onNoFillRef = useRef(onNoFill);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const sourceIndexRef = useRef(0);
  const retryCountRef = useRef(0);
  const hasStartedRef = useRef(false);
  const isMutedRef = useRef(true);
  const manualPlayCheckRef = useRef<NodeJS.Timeout | null>(null);

  const adsManagerRef = useRef<any>(null);
  const adsLoaderRef = useRef<any>(null);
  const adDisplayContainerRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const videoObserverRef = useRef<MutationObserver | null>(null);

  onCompleteRef.current = onComplete;
  onNoFillRef.current = onNoFill;
  isMutedRef.current = isMuted;

  const addDebug = useCallback((message: string) => {
    debugLog(message);
    if (isMountedRef.current) {
      setDebugInfo((prev) => {
        const newInfo = [
          ...prev,
          `${new Date().toLocaleTimeString()}: ${message}`,
        ];
        if (newInfo.length > 25) return newInfo.slice(-25);
        return newInfo;
      });
    }
  }, []);

  // ── Prime any <video> element the instant it exists, BEFORE IMA (or the
  // creative) gets a chance to call .play() on it unmuted. This is the fix
  // for the "big black play button" fallback UI: that UI only appears once
  // the browser has already rejected an unmuted/blocked play() attempt, so
  // catching the element early is what prevents the rejection in the first
  // place, rather than reacting to it after the fact. ──
  const primeVideoElement = useCallback(
    (video: HTMLVideoElement) => {
      try {
        video.muted = true;
        video.defaultMuted = true;
        video.volume = 0;
        video.playsInline = true;
        video.setAttribute("playsinline", "true");
        video.setAttribute("webkit-playsinline", "true");
        // Strip native controls — this is what produces the big center
        // play circle + scrubber/mute bar you see when autoplay is blocked.
        video.controls = false;
        video.removeAttribute("controls");

        if (!video.dataset.primed) {
          video.dataset.primed = "true";
          addDebug("🎯 Primed injected <video> element for autoplay");
        }
      } catch (err) {
        addDebug(`❌ primeVideoElement threw: ${err}`);
      }
    },
    [addDebug],
  );

  // Watch the ad container from the moment it mounts (before requestAds()
  // is ever called) so we catch every <video> IMA or the creative injects,
  // including ones added a level deep inside wrapper elements.
  useEffect(() => {
    if (!adContainerRef.current) return;

    videoObserverRef.current = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach((node) => {
          if (node instanceof HTMLVideoElement) {
            primeVideoElement(node);
          }
          if (node instanceof HTMLElement) {
            node
              .querySelectorAll?.("video")
              .forEach((v) => primeVideoElement(v as HTMLVideoElement));
          }
        });
      });
    });

    videoObserverRef.current.observe(adContainerRef.current, {
      childList: true,
      subtree: true,
    });

    return () => {
      videoObserverRef.current?.disconnect();
      videoObserverRef.current = null;
    };
  }, [primeVideoElement]);

  // Measure real container size
  useEffect(() => {
    if (!adContainerRef.current) return;

    const updateSize = () => {
      const el = adContainerRef.current;
      if (!el) return;
      const width = Math.max(el.clientWidth || 320, 320);
      const height = Math.max(el.clientHeight || Math.round(width * (9 / 16)), 180);
      setPlayerSize({ width, height });
    };

    updateSize();

    resizeObserverRef.current = new ResizeObserver(updateSize);
    resizeObserverRef.current.observe(adContainerRef.current);

    window.addEventListener("orientationchange", updateSize);
    window.addEventListener("resize", updateSize);

    return () => {
      resizeObserverRef.current?.disconnect();
      window.removeEventListener("orientationchange", updateSize);
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  // Resize AdsManager when container size changes
  useEffect(() => {
    if (adsManagerRef.current && status === "playing") {
      try {
        adsManagerRef.current.resize(
          playerSize.width,
          playerSize.height,
          google.ima.ViewMode.NORMAL,
        );
        addDebug(`Resized AdsManager → ${playerSize.width}×${playerSize.height}`);
      } catch {}
    }
  }, [playerSize, status, addDebug]);

  const destroyAds = useCallback(() => {
    try {
      adsManagerRef.current?.destroy();
    } catch {}
    try {
      adsLoaderRef.current?.contentComplete?.();
      adsLoaderRef.current?.destroy();
    } catch {}
    adsManagerRef.current = null;
    adsLoaderRef.current = null;
    adDisplayContainerRef.current = null;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (manualPlayCheckRef.current) {
        clearTimeout(manualPlayCheckRef.current);
        manualPlayCheckRef.current = null;
      }
      destroyAds();
    };
  }, [destroyAds]);

  useEffect(() => {
    ALL_SOURCES.forEach((s, i) => {
      addDebug(
        `🔧 Source ${i + 1}/${ALL_SOURCES.length} [${labelForSource(s)}]: ${s}`,
      );
    });
    AD_NETWORKS.filter((n) => !n.url).forEach((n) => {
      addDebug(
        `⚠️ Env var for ${n.name} is EMPTY/undefined — ${n.name} will never be requested`,
      );
    });
  }, [addDebug]);

  const getVastTag = useCallback(() => {
    const base =
      ad.vast_tag_url ||
      ALL_SOURCES[sourceIndexRef.current] ||
      ALL_SOURCES[0];
    const separator = base.includes("?") ? "&" : "?";
    const tag = `${base}${separator}cb=${Date.now()}`;
    addDebug(
      `📤 VAST Tag (source ${sourceIndexRef.current + 1}/${ALL_SOURCES.length} [${labelForSource(ALL_SOURCES[sourceIndexRef.current])}]): ${tag}`,
    );
    return tag;
  }, [ad.vast_tag_url, addDebug]);

  // Kick off IMA SDK loading as soon as the player mounts, so it's likely
  // ready (or close to it) by the time startAd() actually needs it.
  useEffect(() => {
    addDebug("Loading IMA SDK...");
    loadImaSdk()
      .then(() => addDebug("✅ IMA SDK loaded successfully"))
      .catch(() => addDebug("❌ Failed to load IMA SDK"));
  }, [addDebug]);

  // Countdown (prefers real remaining time from IMA)
  useEffect(() => {
    if (status !== "playing") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      if (adsManagerRef.current) {
        try {
          const real = adsManagerRef.current.getRemainingTime();
          if (typeof real === "number" && isFinite(real) && real >= 0) {
            setRemainingTime(Math.ceil(real));
            return;
          }
        } catch {}
      }

      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          addDebug("⏱️ Fallback timer reached 0");
          return 0;
        }
        return prev - 1;
      });
    }, 400);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status, addDebug]);

  // Manual play() the user can trigger directly — a real click always
  // satisfies browser autoplay policy, regardless of engine, so this is
  // the guaranteed fallback for browsers that block autoplay even when
  // the video is muted/primed correctly.
  const manualPlay = useCallback(() => {
    if (!adContainerRef.current) return;
    const videos = adContainerRef.current.querySelectorAll("video");
    videos.forEach((video) => {
      try {
        video
          .play()
          .then(() => {
            addDebug("✅ Manual play() resolved from user tap");
            setShowManualPlay(false);
          })
          .catch((err) =>
            addDebug(`❌ Manual play() REJECTED: ${err?.name || err}`),
          );
      } catch (err) {
        addDebug(`❌ manualPlay threw: ${err}`);
      }
    });
  }, [addDebug]);

  // Force play any video IMA injects (fixes black screen), and arm a
  // one-second check that reveals a real tap-to-play button if the browser
  // is still refusing autoplay after priming + retries.
  const forcePlayInternalVideos = useCallback(() => {
    if (!adContainerRef.current) return;

    const videos = adContainerRef.current.querySelectorAll("video");
    addDebug(`🔍 forcePlayInternalVideos: found ${videos.length} <video> el(s)`);

    videos.forEach((video, idx) => {
      try {
        if (!video.currentSrc && !video.src) return;

        if (!video.dataset.diagAttached) {
          video.dataset.diagAttached = "true";

          addDebug(
            `🔍 video[${idx}] src=${video.currentSrc || video.src || "(none)"} ` +
              `readyState=${video.readyState} networkState=${video.networkState} ` +
              `paused=${video.paused} muted=${video.muted}`,
          );

          video.addEventListener("error", () => {
            const err = video.error;
            addDebug(
              `❌ video[${idx}] error event: code=${err?.code} message=${err?.message || "(none)"} ` +
                `networkState=${video.networkState} readyState=${video.readyState}`,
            );
          });
          video.addEventListener("stalled", () =>
            addDebug(`⚠️ video[${idx}] stalled (network stalled while fetching)`),
          );
          video.addEventListener("waiting", () =>
            addDebug(`⚠️ video[${idx}] waiting (buffering, not enough data)`),
          );
          video.addEventListener("loadedmetadata", () =>
            addDebug(
              `ℹ️ video[${idx}] loadedmetadata: ${video.videoWidth}×${video.videoHeight}, duration=${video.duration}`,
            ),
          );
          video.addEventListener("playing", () => {
            addDebug(`✅ video[${idx}] playing event fired (frame is actually rendering)`);
            setShowManualPlay(false);
          });
        }

        primeVideoElement(video);

        if (video.paused) {
          addDebug(`⚠️ video[${idx}] is paused — nudging playback as a fallback`);
          video
            .play()
            .then(() => addDebug(`✅ video[${idx}] fallback play() resolved`))
            .catch((err) =>
              addDebug(`❌ video[${idx}] fallback play() REJECTED: ${err?.name || err}: ${err?.message || ""}`),
            );
        }
      } catch (err) {
        addDebug(`❌ video[${idx}] forcePlayInternalVideos threw: ${err}`);
      }
    });

    // If, after our retries, the video is STILL paused, the browser is
    // actively blocking programmatic autoplay — surface a real tap target
    // rather than silently looping forever.
    if (manualPlayCheckRef.current) clearTimeout(manualPlayCheckRef.current);
    manualPlayCheckRef.current = setTimeout(() => {
      if (!adContainerRef.current || !isMountedRef.current) return;
      const stillPaused = Array.from(
        adContainerRef.current.querySelectorAll("video"),
      ).some((v) => v.paused && (v.currentSrc || v.src));
      if (stillPaused) {
        addDebug("⚠️ Video still paused after retries — showing manual play button");
        setShowManualPlay(true);
      }
    }, 1000);
  }, [addDebug, primeVideoElement]);

  const toggleMute = useCallback(() => {
    const next = !isMutedRef.current;
    isMutedRef.current = next;
    setIsMuted(next);

    try {
      adsManagerRef.current?.setVolume(next ? 0 : 1);
    } catch {}

    if (adContainerRef.current) {
      adContainerRef.current.querySelectorAll("video").forEach((v) => {
        try {
          v.muted = next;
          if (!next) v.volume = 1;
        } catch {}
      });
    }

    addDebug(`🔊 Mute toggled → ${next ? "muted" : "unmuted"}`);
  }, [addDebug]);

  const handleSourceFailure = useCallback(() => {
    setLiveAdTitle(null);
    setShowManualPlay(false);
    destroyAds();

    if (sourceIndexRef.current < ALL_SOURCES.length - 1) {
      sourceIndexRef.current += 1;
      retryCountRef.current += 1;
      addDebug(
        `🔄 Retrying with fallback source ${sourceIndexRef.current + 1}/${ALL_SOURCES.length} [${labelForSource(ALL_SOURCES[sourceIndexRef.current])}]`,
      );
      setStatus("retrying");
      setTimeout(() => {
        if (isMountedRef.current) {
          startAdRef.current?.();
        }
      }, 600);
      return;
    }

    addDebug(`❌ All ${ALL_SOURCES.length} ad sources exhausted — no fill`);
    setStatus("error");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimeout(() => onNoFillRef.current(), 900);
  }, [addDebug, destroyAds]);

  const startAdRef = useRef<() => void>(() => {});

  const startAd = useCallback(async () => {
    addDebug(
      `▶️ startAd() called (source ${sourceIndexRef.current + 1}/${ALL_SOURCES.length} [${labelForSource(ALL_SOURCES[sourceIndexRef.current])}])`,
    );

    if (!adContainerRef.current || !videoRef.current) {
      addDebug("❌ ERROR: Ad container or video element not ready");
      handleSourceFailure();
      return;
    }

    destroyAds();

    setStatus("loading");
    setLiveAdTitle(null);
    setShowManualPlay(false);
    setRemainingTime(ad.duration_seconds);
    isMutedRef.current = true;
    setIsMuted(true);
    addDebug("📶 Status set to loading");

    try {
      if (typeof google === "undefined" || !google.ima) {
        addDebug("⏳ Ensuring IMA SDK is ready...");
        try {
          await loadImaSdk();
          addDebug("✅ IMA SDK ready");
        } catch {
          addDebug("❌ ERROR: IMA SDK failed to load");
          handleSourceFailure();
          return;
        }
      }

      // Bail out if the component unmounted or a newer startAd() call
      // (e.g. from a fallback retry) took over while we were waiting.
      if (!isMountedRef.current) return;

      try {
        (google.ima as any).settings.setDisableCustomPlaybackForIOS10Plus(true);
        (google.ima as any).settings.setNumRedirects(8);
      } catch {}

      const ima = (window as any).google.ima;

      addDebug("🛠️ Creating AdDisplayContainer");
      const adDisplayContainer = new ima.AdDisplayContainer(
        adContainerRef.current,
        videoRef.current,
      );
      adDisplayContainerRef.current = adDisplayContainer;

      addDebug("🛠️ Initializing AdDisplayContainer");
      adDisplayContainer.initialize();

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
        true,
      );

      addDebug("🛠️ Creating AdsLoader");
      const adsLoader = new ima.AdsLoader(adDisplayContainer);
      adsLoaderRef.current = adsLoader;

      adsLoader.addEventListener(
        google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
        (e: any) => {
          addDebug(
            `✅ AdsManagerLoaded event fired (source ${sourceIndexRef.current + 1} [${labelForSource(ALL_SOURCES[sourceIndexRef.current])}])`,
          );
          try {
            const adsManager = e.getAdsManager(videoRef.current);
            adsManagerRef.current = adsManager;
            addDebug("✅ AdsManager created successfully");

            adsManager.addEventListener(
              (google.ima.AdEvent.Type as any).LOADED,
              (loadedEvent: any) => {
                const loadedAd = loadedEvent?.getAd?.();
                const duration = loadedAd?.getDuration?.();
                if (
                  typeof duration === "number" &&
                  duration > 0 &&
                  isFinite(duration)
                ) {
                  const secs = Math.ceil(duration);
                  setRemainingTime(secs);
                  addDebug(`ℹ️ Real ad duration from network: ${secs}s`);
                }
                const networkTitle = loadedAd?.getTitle?.();
                if (networkTitle && networkTitle.trim().length > 0) {
                  addDebug(`ℹ️ Network provided ad title: "${networkTitle}"`);
                  setLiveAdTitle(networkTitle.trim());
                } else {
                  addDebug("ℹ️ Network did not provide an ad title");
                }

                // Prime immediately once IMA has a video element attached
                // to the ad — don't wait for STARTED.
                adContainerRef.current
                  ?.querySelectorAll("video")
                  .forEach((v) => primeVideoElement(v as HTMLVideoElement));
              },
            );

            adsManager.addEventListener(
              google.ima.AdEvent.Type.STARTED,
              () => {
                addDebug("▶️ Ad STARTED");
                setStatus("playing");
                forcePlayInternalVideos();
                // Retry a couple of times – some creatives need it
                setTimeout(forcePlayInternalVideos, 300);
                setTimeout(forcePlayInternalVideos, 800);
              },
            );

            const finishAd = () => {
              addDebug("✅ Ad completed");
              setStatus("idle");
              setShowManualPlay(false);
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              if (manualPlayCheckRef.current) {
                clearTimeout(manualPlayCheckRef.current);
                manualPlayCheckRef.current = null;
              }
              sourceIndexRef.current = 0;
              retryCountRef.current = 0;
              destroyAds();
              onCompleteRef.current(ad.id);
            };

            adsManager.addEventListener(
              google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,
              finishAd,
            );
            adsManager.addEventListener(
              google.ima.AdEvent.Type.COMPLETE,
              finishAd,
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

            // Force fresh measurement right before init
            const el = adContainerRef.current;
            const width = el ? Math.max(el.clientWidth, 320) : 640;
            const height = el
              ? Math.max(el.clientHeight, Math.round(width * 9 / 16))
              : 360;

            addDebug(`🛠️ Initializing AdsManager at ${width}×${height}`);

            try {
              adsManager.init(width, height, google.ima.ViewMode.NORMAL);
              adsManager.setVolume(isMutedRef.current ? 0 : 1);

              // Call start() on the very next frame rather than after an
              // arbitrary 150ms delay — a long delay risks letting the
              // browser's "recent user gesture" window expire on stricter
              // engines (Safari/Firefox), which is what forces IMA into
              // its manual click-to-play fallback UI.
              requestAnimationFrame(() => {
                try {
                  adsManager.start();
                  addDebug("▶️ Starting AdsManager");
                } catch (err) {
                  addDebug("❌ adsManager.start() failed");
                  console.error(err);
                  handleSourceFailure();
                }
              });
            } catch (err) {
              addDebug("❌ adsManager.init() failed");
              console.error(err);
              handleSourceFailure();
            }
          } catch (err) {
            addDebug(
              `❌ ERROR in AdsManagerLoaded event (source ${sourceIndexRef.current + 1})`,
            );
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
      adsRequest.linearAdSlotWidth = playerSize.width;
      adsRequest.linearAdSlotHeight = playerSize.height;

      try {
        (adsRequest as any).setAdWillAutoPlay(true);
        (adsRequest as any).setAdWillPlayMuted(true);
      } catch {}

      adsLoader.requestAds(adsRequest);
      addDebug("📤 Ad request sent");
    } catch (err) {
      addDebug(
        `❌ CRITICAL ERROR in startAd (source ${sourceIndexRef.current + 1})`,
      );
      console.error("Critical error:", err);
      handleSourceFailure();
    }
  }, [
    ad.id,
    ad.duration_seconds,
    getVastTag,
    addDebug,
    handleSourceFailure,
    destroyAds,
    playerSize,
    forcePlayInternalVideos,
    primeVideoElement,
  ]);

  startAdRef.current = startAd;

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    sourceIndexRef.current = 0;
    retryCountRef.current = 0;
    startAd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visualProgress = Math.min(
    100,
    Math.max(
      0,
      100 - (remainingTime / Math.max(ad.duration_seconds, 1)) * 100,
    ),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/90 p-0 sm:p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[96vh] overflow-hidden rounded-t-2xl sm:rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl">
        <div className="relative">
          <div
            ref={adContainerRef}
            className="ad-container relative w-full bg-black overflow-hidden h-[50vh] sm:h-auto sm:aspect-video max-h-[70vh] [&_video]:!object-contain [&_video::-webkit-media-controls]:!hidden"
            style={{ minHeight: 200 }}
          >
            {status === "idle" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white/50">
                  <MdOndemandVideo className="mx-auto text-5xl" />
                  <p className="mt-3 text-sm">Click &quot;Watch Ad&quot; to start</p>
                </div>
              </div>
            )}

            {(status === "loading" || status === "retrying") && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-center">
                  <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-[var(--brand-gold)]" />
                  <p className="mt-3 text-sm text-white/60">
                    {status === "retrying"
                      ? "Trying another network..."
                      : "Loading ad..."}
                  </p>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                <div className="px-6 text-center">
                  <MdInfo className="mx-auto text-4xl text-amber-400" />
                  <p className="mt-2 text-sm text-white/70">
                    No ad available from any source right now.
                  </p>
                </div>
              </div>
            )}

            {status === "playing" && showManualPlay && (
              <button
                type="button"
                onClick={manualPlay}
                aria-label="Play ad"
                className="absolute inset-0 z-20 flex items-center justify-center bg-black/50"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-gold)] shadow-lg transition hover:brightness-110 active:scale-95">
                  <MdPlayArrow className="text-4xl text-black" />
                </span>
              </button>
            )}
          </div>

          <video
            ref={videoRef}
            className="hidden"
            playsInline
            muted
            // @ts-ignore
            webkit-playsinline="true"
          />

          {status === "playing" && (
            <div className="absolute bottom-0 left-0 right-0 z-10">
              <div className="h-1.5 bg-black/50">
                <div
                  className="h-full bg-[var(--brand-gold)] transition-all duration-300"
                  style={{ width: `${visualProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2">
            <span className="rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white">
              {ad.category}
            </span>
            {status === "playing" && (
              <span className="flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white">
                <MdTimer className="text-sm" />
                {remainingTime}s
              </span>
            )}
          </div>

          <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold">
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

          {status === "playing" && !showManualPlay && (
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? "Unmute ad" : "Mute ad"}
              className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/85 active:scale-95"
            >
              {isMuted ? (
                <>
                  <MdVolumeOff className="text-base" /> Tap for sound
                </>
              ) : (
                <MdVolumeUp className="text-base" />
              )}
            </button>
          )}

          {process.env.NODE_ENV === "development" && (
            <button
              onClick={() => {
                const debugSection = document.getElementById("debug-info");
                if (debugSection) debugSection.classList.toggle("hidden");
              }}
              className="absolute bottom-3 right-3 z-20 rounded-full bg-black/50 p-1.5 text-xs text-white/40 hover:bg-black/70 hover:text-white/80"
            >
              <MdInfo className="text-lg" />
            </button>
          )}
        </div>

        <div className="p-4 sm:p-5">
          <h3 className="text-base font-semibold text-white truncate">
            {liveAdTitle ?? "Sponsored Video Ad"}
          </h3>
          <p className="mt-0.5 text-sm text-white/50">
            {status === "playing"
              ? showManualPlay
                ? "Tap the play button to start"
                : `Ad is playing... ${remainingTime}s remaining`
              : status === "retrying"
                ? "Loading next network..."
                : status === "error"
                  ? "No ads available right now. Please try again later."
                  : "Watch the ad to earn your reward"}
          </p>

          <button
            onClick={startAd}
            disabled={status !== "idle" && status !== "error"}
            className="mt-4 w-full rounded-xl bg-[var(--brand-gold)] py-3 text-sm font-semibold text-black transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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

          <p className="mt-2.5 text-center text-[11px] text-white/30">
            Do not close this window. Reward will be credited automatically.
          </p>
        </div>

        {process.env.NODE_ENV === "development" && (
          <div
            id="debug-info"
            className="hidden border-t border-white/10 bg-black/60 p-3 text-xs font-mono text-white/60 max-h-48 overflow-y-auto"
          >
            <p className="mb-1 font-semibold text-white/80">🐛 Debug Log:</p>
            <p className="mb-1 text-xs text-amber-400/70">
              Sources: {ALL_SOURCES.length} | Current:{" "}
              {sourceIndexRef.current + 1} | Size: {playerSize.width}×
              {playerSize.height}
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
  }, []);

  useEffect(() => {
    if (cooldownUntil !== null) {
      try {
        localStorage.setItem(COOLDOWN_STORAGE_KEY, String(cooldownUntil));
      } catch {}
    } else {
      try {
        localStorage.removeItem(COOLDOWN_STORAGE_KEY);
      } catch {}
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
      const result = { success: true }; // replace with real claimAdReward later
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