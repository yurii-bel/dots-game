import { SFX, type SoundCue } from "./registry";

export const SFX_MUTE_STORAGE_KEY = "dots.sfxMuted";

const DEFAULT_VOLUME = 0.55;

let muted = false;
let unlocked = false;
let muteHydrated = false;

function hydrateMute(): void {
  if (muteHydrated || typeof window === "undefined") return;
  muteHydrated = true;
  muted = window.localStorage.getItem(SFX_MUTE_STORAGE_KEY) === "1";
}

export function isSfxMuted(): boolean {
  hydrateMute();
  return muted;
}

export function setSfxMuted(next: boolean): void {
  hydrateMute();
  muted = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SFX_MUTE_STORAGE_KEY, next ? "1" : "0");
  }
}

export function toggleSfxMuted(): boolean {
  const next = !isSfxMuted();
  setSfxMuted(next);
  return next;
}

/**
 * Call from a user gesture so later (including opponent) moves can play
 * under browser autoplay rules.
 */
export function unlockSfx(): void {
  if (unlocked || typeof window === "undefined") return;
  unlocked = true;
  try {
    const probe = new Audio(SFX.placeDot);
    probe.volume = 0;
    void probe.play().then(
      () => {
        probe.pause();
      },
      () => {
        // Ignore — gesture already recorded; real plays may still succeed.
      },
    );
  } catch {
    // Ignore construct failures; unlocked flag still allows later attempts.
  }
}

/**
 * Fire-and-forget cue. No-ops when muted, locked, or SSR.
 * Fresh HTMLAudioElement per play so rapid moves do not cut each other off.
 */
export function playSfx(cue: SoundCue): void {
  if (typeof window === "undefined") return;
  hydrateMute();
  if (muted || !unlocked) return;

  const url = SFX[cue];
  try {
    const audio = new Audio(url);
    audio.volume = DEFAULT_VOLUME;
    void audio.play().catch(() => {
      // Ignore AbortError / NotAllowedError after unlock race.
    });
  } catch {
    // Ignore decode / construct failures (missing asset in odd deploys).
  }
}
