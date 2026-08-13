// Lightweight in-app notification chime - generated with the Web Audio API
// (a short two-tone beep) rather than shipping/loading an audio file, and
// muted state is remembered in localStorage. play() is a no-op (and never
// throws) if the browser blocks audio autoplay before any user interaction -
// that's expected/normal behavior, not an error worth surfacing.
const MUTE_STORAGE_KEY = "earnxact_notif_sound_muted";

export function isNotificationSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTE_STORAGE_KEY) === "1";
}

export function setNotificationSoundMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MUTE_STORAGE_KEY, muted ? "1" : "0");
}

export function playNotificationChime(): void {
  if (typeof window === "undefined" || isNotificationSoundMuted()) return;

  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    [880, 1320].forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const startAt = now + index * 0.12;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, startAt);

      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(0.15, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.15);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.16);
    });

    setTimeout(() => ctx.close(), 500);
  } catch {
    // Autoplay restrictions or unsupported browser - silently ignore.
  }
}
