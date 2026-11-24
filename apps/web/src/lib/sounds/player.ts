import { SFX, type SoundCue } from "./registry";

export const SFX_MUTE_STORAGE_KEY = "dots.sfxMuted";

/** Master gain for SFX. Must stay ≤ 1 so the decoded buffer is not driven into clipping. */
export const SFX_MASTER_GAIN = 1;

/** Absolute sample threshold used to skip encoder/leading dead air on start. */
export const LEADING_SILENCE_THRESHOLD = 0.01;

let muted = false;
let unlocked = false;
let muteHydrated = false;

let audioCtx: AudioContext | null = null;
const buffers = new Map<SoundCue, AudioBuffer>();
const startOffsetsSec = new Map<SoundCue, number>();
let loadPromise: Promise<void> | null = null;

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
 * First frame where any channel exceeds `threshold`, as seconds.
 * Pure helper so we can skip leading dead air without altering the audible waveform.
 */
export function leadingSilenceOffsetSeconds(
  channelData: ArrayLike<ArrayLike<number>>,
  sampleRate: number,
  threshold: number = LEADING_SILENCE_THRESHOLD,
): number {
  if (sampleRate <= 0 || channelData.length === 0) return 0;
  const length = channelData[0]?.length ?? 0;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < channelData.length; c++) {
      const sample = channelData[c]?.[i] ?? 0;
      if (Math.abs(sample) > threshold) {
        return i / sampleRate;
      }
    }
  }
  return 0;
}

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

function channelArrays(buffer: AudioBuffer): Float32Array[] {
  const channels: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }
  return channels;
}

async function decodeCue(ctx: AudioContext, cue: SoundCue): Promise<void> {
  if (buffers.has(cue)) return;
  const response = await fetch(SFX[cue]);
  if (!response.ok) {
    throw new Error(`Failed to fetch SFX ${cue}: ${response.status}`);
  }
  const bytes = await response.arrayBuffer();
  // copy before decode — some browsers detach the transferred buffer
  const audioBuffer = await ctx.decodeAudioData(bytes.slice(0));
  buffers.set(cue, audioBuffer);
  startOffsetsSec.set(
    cue,
    leadingSilenceOffsetSeconds(
      channelArrays(audioBuffer),
      audioBuffer.sampleRate,
    ),
  );
}

function ensureLoaded(): Promise<void> {
  if (!loadPromise) {
    const ctx = getAudioContext();
    loadPromise = Promise.all(
      (Object.keys(SFX) as SoundCue[]).map((cue) => decodeCue(ctx, cue)),
    ).then(
      () => undefined,
      (err: unknown) => {
        loadPromise = null;
        throw err;
      },
    );
  }
  return loadPromise;
}

function startCue(cue: SoundCue): void {
  const ctx = getAudioContext();
  const buffer = buffers.get(cue);
  if (!buffer) return;

  // Fresh source per play — overlaps do not cut each other off; no shared element restart.
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  // Single gain stage only — no filters, compressors, or playbackRate changes.
  const gain = ctx.createGain();
  gain.gain.value = SFX_MASTER_GAIN;

  source.connect(gain);
  gain.connect(ctx.destination);

  const offset = startOffsetsSec.get(cue) ?? 0;
  const remaining = Math.max(0, buffer.duration - offset);
  if (remaining <= 0) return;
  source.start(0, offset, remaining);
}

/**
 * Call from a user gesture so later (including opponent) moves can play
 * under browser autoplay rules. Resumes AudioContext and pre-decodes cues.
 */
export function unlockSfx(): void {
  if (typeof window === "undefined") return;
  unlocked = true;
  try {
    const ctx = getAudioContext();
    void ctx.resume();
    void ensureLoaded().catch(() => {
      // Ignore preload failures; playSfx may retry after the next gesture.
    });
  } catch {
    // Ignore construct failures; unlocked flag still allows later attempts.
  }
}

/**
 * Fire-and-forget cue. No-ops when muted, locked, or SSR.
 * Uses a pre-decoded AudioBuffer and a fresh BufferSource per play.
 */
export function playSfx(cue: SoundCue): void {
  if (typeof window === "undefined") return;
  hydrateMute();
  if (muted || !unlocked) return;

  try {
    const ctx = getAudioContext();
    if (buffers.has(cue) && ctx.state === "running") {
      startCue(cue);
      return;
    }

    void (async () => {
      try {
        if (ctx.state === "suspended") {
          await ctx.resume();
        }
        await ensureLoaded();
        startCue(cue);
      } catch {
        // Ignore decode / autoplay failures after unlock race.
      }
    })();
  } catch {
    // Ignore construct failures (missing Web Audio in odd environments).
  }
}
