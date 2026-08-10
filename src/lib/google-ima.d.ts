// types/google-ima.d.ts
declare namespace google {
  namespace ima {
    class AdDisplayContainer {
      constructor(
        containerElement: HTMLElement,
        videoElement: HTMLVideoElement,
      );
    }

    class AdsLoader {
      constructor(adDisplayContainer: AdDisplayContainer);
      requestAds(adsRequest: AdsRequest): void;
      addEventListener(type: string, listener: (event: any) => void): void;
      removeEventListener(type: string, listener: (event: any) => void): void;
    }

    class AdsManager {
      init(width: number, height: number, viewMode: ViewMode): void;
      start(): void;
      addEventListener(type: string, listener: (event: any) => void): void;
      removeEventListener(type: string, listener: (event: any) => void): void;
    }

    class AdsRequest {
      adTagUrl: string;
      linearAdSlotWidth?: number;
      linearAdSlotHeight?: number;
    }

    enum ViewMode {
      NORMAL = "normal",
      FULLSCREEN = "fullscreen",
    }

    namespace AdEvent {
      enum Type {
        CONTENT_RESUME_REQUESTED = "contentResumeRequested",
        COMPLETE = "complete",
        STARTED = "started",
        SKIPPED = "skipped",
      }
    }

    namespace AdErrorEvent {
      enum Type {
        AD_ERROR = "adError",
      }
    }

    namespace AdsManagerLoadedEvent {
      enum Type {
        ADS_MANAGER_LOADED = "adsManagerLoaded",
      }
    }
  }
}
