"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { resignGame } from "@/hooks/use-game-socket";
import { useGameStore } from "@/stores/game-store";

export function GameChrome() {
  const connection = useGameStore((s) => s.connection);
  const yourColor = useGameStore((s) => s.yourColor);
  const state = useGameStore((s) => s.state);
  const roomCode = useGameStore((s) => s.roomCode);
  const opponentConnected = useGameStore((s) => s.opponentConnected);
  const lastError = useGameStore((s) => s.lastError);
  const finishedMessage = useGameStore((s) => s.finishedMessage);
  const pending = useGameStore((s) => s.pending);

  const turnLabel = !state
    ? "—"
    : state.status === "finished"
      ? "Finished"
      : state.currentPlayer === yourColor
        ? "Your turn"
        : "Opponent’s turn";

  return (
    <header className="flex flex-col gap-3 border-b border-border/80 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">DOTS · 1v1</p>
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {yourColor ? (
              <>
                You are{" "}
                <span className={yourColor === "blue" ? "text-blue-700" : "text-red-600"}>
                  {yourColor}
                </span>
              </>
            ) : (
              "Game"
            )}
          </h1>
          <span className="text-sm text-muted-foreground">{turnLabel}</span>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <span>
            <span className="font-medium text-blue-700">Blue</span>{" "}
            {state?.scores.blue ?? 0}
          </span>
          <span>
            <span className="font-medium text-red-600">Red</span> {state?.scores.red ?? 0}
          </span>
          <span className="text-muted-foreground">v{state?.version ?? 0}</span>
          {roomCode ? (
            <span className="text-muted-foreground">
              Room <code className="rounded bg-secondary px-1.5 py-0.5 text-foreground">{roomCode}</code>
            </span>
          ) : null}
          {!opponentConnected && connection === "playing" ? (
            <span className="text-amber-700">Opponent disconnected…</span>
          ) : null}
          {pending ? <span className="text-muted-foreground">Sending move…</span> : null}
        </div>
        {lastError ? <p className="text-sm text-destructive">{lastError}</p> : null}
        {finishedMessage ? <p className="text-sm font-medium">{finishedMessage}</p> : null}
        {connection === "waiting" ? (
          <p className="text-sm text-muted-foreground">
            Waiting for opponent{roomCode ? ` — share code ${roomCode}` : ""}.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {connection === "playing" ? (
          <Button type="button" variant="outline" size="sm" onClick={() => resignGame()}>
            Resign
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="sm" asChild>
          <Link href="/">Lobby</Link>
        </Button>
      </div>
    </header>
  );
}
