import type { WireBoard } from "@dots/shared";

/** Per-cell fade duration for a §8.4 forfeit fill. */
export const CAPTURE_REVEAL_FADE_MS = 380;

/** Delay between successive newly captured cells. */
export const CAPTURE_REVEAL_STAGGER_MS = 32;

/**
 * Indices whose `capturedBy` newly appeared or changed owner from `prev` → `next`.
 * Used client-side only to animate Declare-grounding forfeits on the final board.
 */
export function diffNewlyCapturedIndices(
  prev: WireBoard | null | undefined,
  next: WireBoard,
): number[] {
  if (next.cells.length === 0) return [];
  const out: number[] = [];
  for (let i = 0; i < next.cells.length; i += 1) {
    const nextOwner = next.cells[i]?.capturedBy ?? null;
    if (nextOwner === null) continue;
    const prevOwner = prev?.cells[i]?.capturedBy ?? null;
    if (prevOwner !== nextOwner) out.push(i);
  }
  return out;
}

function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/**
 * Staggered 0…1 opacity per newly captured cell index (sorted for stable order).
 * `reducedMotion` snaps every cell to fully revealed.
 */
export function captureRevealOpacities(
  indices: readonly number[],
  elapsedMs: number,
  opts?: {
    fadeMs?: number;
    staggerMs?: number;
    reducedMotion?: boolean;
  },
): Map<number, number> {
  const fadeMs = opts?.fadeMs ?? CAPTURE_REVEAL_FADE_MS;
  const staggerMs = opts?.staggerMs ?? CAPTURE_REVEAL_STAGGER_MS;
  const map = new Map<number, number>();

  if (opts?.reducedMotion) {
    for (const index of indices) map.set(index, 1);
    return map;
  }

  const sorted = [...indices].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i += 1) {
    const start = i * staggerMs;
    const t = (elapsedMs - start) / fadeMs;
    map.set(sorted[i]!, smoothstep(t));
  }
  return map;
}

export function captureRevealDurationMs(
  count: number,
  opts?: { fadeMs?: number; staggerMs?: number },
): number {
  if (count <= 0) return 0;
  const fadeMs = opts?.fadeMs ?? CAPTURE_REVEAL_FADE_MS;
  const staggerMs = opts?.staggerMs ?? CAPTURE_REVEAL_STAGGER_MS;
  return fadeMs + Math.max(0, count - 1) * staggerMs;
}

export function isCaptureRevealComplete(
  opacities: ReadonlyMap<number, number>,
): boolean {
  if (opacities.size === 0) return true;
  for (const opacity of opacities.values()) {
    if (opacity < 1) return false;
  }
  return true;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
