"use client";

import { useEffect, useState } from "react";
import { formatElapsed } from "@/lib/format-elapsed";
import { useGameStore } from "@/stores/game-store";

/**
 * Elapsed match clock. Shows 0:00 while waiting (no startedAt).
 * Ticks while playing; freezes at finishedAt − startedAt after finish.
 */
export function GameTimer() {
  const startedAt = useGameStore((s) => s.startedAt);
  const finishedAt = useGameStore((s) => s.finishedAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startedAt == null || finishedAt != null) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt, finishedAt]);

  const elapsedMs =
    startedAt == null ? 0 : (finishedAt ?? now) - startedAt;

  return (
    <span className="tabular-nums text-muted-foreground" aria-label="Game time">
      {formatElapsed(elapsedMs)}
    </span>
  );
}
