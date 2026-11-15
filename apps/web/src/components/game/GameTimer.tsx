"use client";

import { useEffect, useState } from "react";
import {
  displayClockMs,
  tickActiveClock,
  type GameClocks,
  type PlayerColor,
} from "@dots/shared";
import { formatElapsed } from "@/lib/format-elapsed";
import { useGameStore } from "@/stores/game-store";

function liveClocks(clocks: GameClocks, now: number): GameClocks {
  if (!clocks.activeColor) return clocks;
  const elapsed = Math.max(0, now - clocks.syncedAt);
  const { clocks: pair } = tickActiveClock(
    { blue: clocks.blue, red: clocks.red },
    clocks.activeColor,
    elapsed,
  );
  return {
    blue: pair.blue,
    red: pair.red,
    activeColor: clocks.activeColor,
    syncedAt: now,
  };
}

function SeatClock({
  color,
  clocks,
  now,
}: {
  color: PlayerColor;
  clocks: GameClocks | null;
  now: number;
}) {
  if (!clocks) {
    return (
      <span className="tabular-nums text-sm text-muted-foreground" aria-label={`${color} clock`}>
        6:00
      </span>
    );
  }
  const live = liveClocks(clocks, now);
  const isActive = live.activeColor === color;
  const ms = displayClockMs(live[color], isActive);
  const low = isActive && ms <= 10_000;

  return (
    <span
      className={
        low
          ? "tabular-nums text-sm font-semibold text-destructive"
          : isActive
            ? "tabular-nums text-sm font-semibold text-foreground"
            : "tabular-nums text-sm text-muted-foreground"
      }
      aria-label={`${color} clock`}
      data-active={isActive ? "true" : "false"}
    >
      {formatElapsed(ms)}
    </span>
  );
}

/**
 * Option B dual clocks for the center header pill.
 * Interpolates from the last server snapshot between syncs.
 */
export function GameTimer() {
  const clocks = useGameStore((s) => s.clocks);
  const finishedAt = useGameStore((s) => s.finishedAt);
  const connection = useGameStore((s) => s.connection);
  const [now, setNow] = useState(() => Date.now());

  const running =
    connection === "playing" && finishedAt == null && clocks?.activeColor != null;

  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [running, clocks?.syncedAt]);

  const turn = clocks?.activeColor;

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-3 py-1.5 shadow-sm backdrop-blur-sm"
      aria-label="Player clocks"
    >
      <SeatClock color="blue" clocks={clocks} now={now} />
      <span
        className={
          turn === "blue"
            ? "rounded-full bg-blue-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
            : turn === "red"
              ? "rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
              : "rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
        }
      >
        {turn === "blue" ? "Blue" : turn === "red" ? "Red" : "—"}
      </span>
      <SeatClock color="red" clocks={clocks} now={now} />
    </div>
  );
}
