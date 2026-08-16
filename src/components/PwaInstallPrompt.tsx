"use client";

import { useEffect, useMemo, useState } from "react";
import { MdClose, MdDownload, MdIosShare } from "react-icons/md";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "earnxact-pwa-install-dismissed";

function isStandalone() {
  if (typeof window === "undefined") return false;

  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if device is mobile
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isSmallScreen = window.innerWidth <= 768;
      return isMobileDevice || isSmallScreen;
    };
    
    setIsMobile(checkMobile());
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
    setIsInstalled(isStandalone());

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("[PWA] Service worker registration failed", error);
      });
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setDismissed(false);
    }

    function handleAppInstalled() {
      setDeferredPrompt(null);
      setIsInstalled(true);
      window.localStorage.setItem(DISMISS_KEY, "1");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const isIos = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }, []);

  const showIosHint = isIos && !isInstalled && !dismissed && isMobile;
  const showInstallPrompt = Boolean(deferredPrompt) && !isInstalled && !dismissed && isMobile;

  async function handleInstall() {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
      setDismissed(true);
      window.localStorage.setItem(DISMISS_KEY, "1");
    }
  }

  function handleDismiss() {
    setDismissed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, "1");
    }
  }

  if (!showInstallPrompt && !showIosHint) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-[70] mx-auto max-w-md rounded-2xl border border-white/10 bg-[color:rgba(5,5,5,0.94)] p-4 text-white shadow-2xl backdrop-blur md:right-6 md:left-auto">
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss install prompt"
        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        <MdClose className="text-lg" />
      </button>

      <div className="pr-8">
        <div className="text-sm font-semibold text-white">Install EarnXact</div>
        <p className="mt-1 text-xs leading-relaxed text-white/65">
          Add EarnXact to your phone for quick access and an app-like full-screen experience.
        </p>
      </div>

      {showInstallPrompt ? (
        <button
          type="button"
          onClick={handleInstall}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--brand-smoky-white)] px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
        >
          <MdDownload className="text-base" />
          Install App
        </button>
      ) : (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-white/70">
          <div className="inline-flex items-center gap-2 font-semibold text-white">
            <MdIosShare className="text-base" />
            iPhone install steps
          </div>
          <div className="mt-1">Tap Share in Safari, then choose Add to Home Screen.</div>
        </div>
      )}
    </div>
  );
}