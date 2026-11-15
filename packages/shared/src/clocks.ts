import { z } from "zod";

/** Option B — turn bank spent first each turn, then main. */
export const TURN_BANK_MS = 20_000 as const;
/** Option B — main time per player (6:00). */
export const MAIN_TIME_MS = 6 * 60_000;

type PlayerColor = "blue" | "red";

export const PlayerClockSchema = z.object({
  turnBankMs: z.number().int().nonnegative(),
  mainMs: z.number().int().nonnegative(),
});
export type PlayerClock = z.infer<typeof PlayerClockSchema>;

export const GameClocksSchema = z.object({
  blue: PlayerClockSchema,
  red: PlayerClockSchema,
  /** Whose clock is depleting; null when waiting / finished. */
  activeColor: z.enum(["blue", "red"]).nullable(),
  /** Server epoch ms when this snapshot was computed. */
  syncedAt: z.number().int().nonnegative(),
});
export type GameClocks = z.infer<typeof GameClocksSchema>;

export type ClocksPair = {
  blue: PlayerClock;
  red: PlayerClock;
};

export function createInitialClocks(): ClocksPair {
  return {
    blue: { turnBankMs: TURN_BANK_MS, mainMs: MAIN_TIME_MS },
    red: { turnBankMs: TURN_BANK_MS, mainMs: MAIN_TIME_MS },
  };
}

function clonePair(clocks: ClocksPair): ClocksPair {
  return {
    blue: { ...clocks.blue },
    red: { ...clocks.red },
  };
}

/**
 * Spend elapsed wall time on the active player: turn bank first, then main.
 * Timed out when main reaches 0 after the bank is exhausted.
 */
export function tickActiveClock(
  clocks: ClocksPair,
  activeColor: PlayerColor,
  elapsedMs: number,
): { clocks: ClocksPair; timedOut: boolean } {
  if (elapsedMs <= 0) {
    return { clocks: clonePair(clocks), timedOut: false };
  }

  const next = clonePair(clocks);
  const player = next[activeColor];
  let remaining = elapsedMs;

  if (player.turnBankMs > 0) {
    const fromBank = Math.min(player.turnBankMs, remaining);
    player.turnBankMs -= fromBank;
    remaining -= fromBank;
  }

  if (remaining > 0) {
    player.mainMs = Math.max(0, player.mainMs - remaining);
  }

  const timedOut = player.turnBankMs === 0 && player.mainMs === 0;
  return { clocks: next, timedOut };
}

/** After a move: refill the next player's turn bank; mains unchanged. */
export function refillTurnBank(
  clocks: ClocksPair,
  nextColor: PlayerColor,
): ClocksPair {
  const next = clonePair(clocks);
  next[nextColor] = {
    ...next[nextColor],
    turnBankMs: TURN_BANK_MS,
  };
  return next;
}

/**
 * Display value: while active and bank remains, show bank; otherwise main.
 * Optionally apply client-side tick from syncedAt for smooth UI.
 */
export function displayClockMs(
  clock: PlayerClock,
  isActive: boolean,
): number {
  if (isActive && clock.turnBankMs > 0) return clock.turnBankMs;
  return clock.mainMs;
}
