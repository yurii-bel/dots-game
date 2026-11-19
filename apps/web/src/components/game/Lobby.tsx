"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { APP_NAME } from "@dots/shared";
import { DualDotSpinner } from "@/components/game/DualDotSpinner";
import { Button } from "@/components/ui/button";
import {
  cancelMatchmaking,
  createPrivateRoom,
  findMatch,
  joinPrivateRoom,
  leaveGame,
  useGameSocket,
} from "@/hooks/use-game-socket";
import {
  loadActiveGame,
  type ActiveGameSession,
} from "@/lib/player-id";
import { getSocketUrl } from "@/lib/socket";
import { useGameStore, type ConnectionStatus } from "@/stores/game-store";
import { cn } from "@/lib/utils";

function socketTone(connection: ConnectionStatus): "ok" | "busy" | "bad" | "idle" {
  switch (connection) {
    case "connected":
    case "playing":
    case "waiting":
    case "matchmaking":
    case "finished":
      return "ok";
    case "connecting":
      return "busy";
    case "error":
      return "bad";
    default:
      return "idle";
  }
}

function socketLabel(connection: ConnectionStatus): string {
  switch (connection) {
    case "connecting":
      return "Connecting…";
    case "connected":
      return "Connected";
    case "matchmaking":
      return "Finding match";
    case "waiting":
      return "Waiting for opponent";
    case "playing":
      return "In game";
    case "finished":
      return "Game finished";
    case "error":
      return "Connection error";
    default:
      return "Idle";
  }
}

export function Lobby() {
  useGameSocket();
  const router = useRouter();
  const connection = useGameStore((s) => s.connection);
  const gameId = useGameStore((s) => s.gameId);
  const roomCode = useGameStore((s) => s.roomCode);
  const lastError = useGameStore((s) => s.lastError);
  const nickname = useGameStore((s) => s.nickname);
  const userId = useGameStore((s) => s.userId);
  const [joinCode, setJoinCode] = useState("");
  const [savedSession, setSavedSession] = useState<ActiveGameSession | null>(null);

  useEffect(() => {
    setSavedSession(loadActiveGame(userId));
  }, [userId]);

  // After create / join / match found — enter the game route (not a blind remount redirect).
  useEffect(() => {
    if (gameId && (connection === "playing" || connection === "waiting")) {
      router.push(`/game/${gameId}`);
    }
  }, [gameId, connection, router]);

  useEffect(() => {
    if (!gameId) {
      setSavedSession(loadActiveGame(userId));
    }
  }, [gameId, connection, userId]);

  const hasResume = Boolean(savedSession?.gameId) && !gameId;
  const busy =
    connection === "matchmaking" || connection === "waiting" || connection === "playing";
  const tone = socketTone(connection);
  const statusText = `${socketLabel(connection)} · ${getSocketUrl()}`;

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col items-center px-6 pb-16 pt-20 sm:pt-24">
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-10">
        {/* Brand hero */}
        <header className="flex animate-[match-desk-in_420ms_ease-out_both] flex-col items-center text-center">
          <h1 className="font-sans text-6xl font-semibold tracking-[0.18em] text-foreground sm:text-7xl">
            {APP_NAME}
          </h1>
          <p className="mt-3 max-w-[18rem] text-sm leading-relaxed text-muted-foreground">
            Classic Спортивные точки — find a match or open a private room.
          </p>
        </header>

        {/* Identity chip — title/rating placeholders until ranking ships */}
        <div
          className="flex animate-[match-desk-in_420ms_ease-out_both] items-center gap-2.5 rounded-md border border-border/70 bg-background/70 px-3 py-2 shadow-[0_1px_0_hsl(210_14%_86%/0.6)] backdrop-blur-sm"
          style={{ animationDelay: "60ms" }}
        >
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="truncate font-medium text-foreground">
              {nickname ?? "—"}
            </span>
            <span className="text-muted-foreground/50" aria-hidden>
              ·
            </span>
            <span
              className="tabular-nums text-muted-foreground"
              title="Classical title — coming soon"
            >
              —
            </span>
            <span className="text-muted-foreground/50" aria-hidden>
              ·
            </span>
            <span
              className="tabular-nums text-muted-foreground"
              title="Classical rating — coming soon"
            >
              —
            </span>
          </div>
          <UserButton
            appearance={{
              elements: {
                avatarBox: "size-7",
              },
            }}
          />
        </div>

        {hasResume ? (
          <div className="w-full space-y-3 rounded-md border border-border/80 bg-secondary/40 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              You have an active game
              {savedSession?.roomCode ? (
                <>
                  {" "}
                  — room{" "}
                  <code className="rounded bg-secondary px-1.5 py-0.5 text-foreground">
                    {savedSession.roomCode}
                  </code>
                </>
              ) : null}
              .
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => {
                  if (!savedSession?.gameId) return;
                  router.push(`/game/${savedSession.gameId}`);
                }}
              >
                Resume game
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  leaveGame({ gameId: savedSession?.gameId });
                  setSavedSession(null);
                }}
              >
                Leave game
              </Button>
            </div>
          </div>
        ) : null}

        {/* Stacked actions */}
        <div
          className="flex w-full animate-[match-desk-in_420ms_ease-out_both] flex-col gap-3"
          style={{ animationDelay: "120ms" }}
        >
          {connection === "matchmaking" ? (
            <div className="flex flex-col gap-3">
              <div className="flex h-11 items-center justify-center gap-2.5 rounded-md border border-border/80 bg-secondary/40">
                <DualDotSpinner label="Finding match" />
                <span className="text-sm text-muted-foreground">Finding match…</span>
              </div>
              <Button type="button" variant="outline" onClick={() => cancelMatchmaking()}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size="lg"
              className="w-full transition-transform active:scale-[0.98]"
              onClick={() => findMatch()}
              disabled={hasResume || busy}
            >
              Find match
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => createPrivateRoom()}
            disabled={hasResume || busy}
          >
            Create private room
          </Button>

          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-md border border-input bg-background/80 px-3 py-2 text-sm tracking-wider placeholder:tracking-normal"
              placeholder="Room code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              disabled={hasResume || busy}
              aria-label="Room code"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={hasResume || busy || !joinCode.trim()}
              onClick={() => joinPrivateRoom(joinCode)}
            >
              Join
            </Button>
          </div>
        </div>

        {roomCode && connection === "waiting" ? (
          <p className="text-center text-sm text-muted-foreground">
            Room ready — code <strong className="text-foreground">{roomCode}</strong>.
            Waiting for opponent…
          </p>
        ) : null}

        {lastError ? (
          <p className="text-center text-sm text-destructive" role="alert">
            {lastError}
          </p>
        ) : null}
      </div>

      {/* Slim socket status */}
      <footer className="absolute bottom-5 left-0 right-0 flex justify-center px-6">
        <div className="group relative">
          <button
            type="button"
            className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={statusText}
            title={statusText}
          >
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                tone === "ok" && "bg-[hsl(160_45%_38%)]",
                tone === "busy" && "bg-[hsl(38_80%_48%)]",
                tone === "bad" && "bg-destructive",
                tone === "idle" && "bg-muted-foreground/50",
              )}
              aria-hidden
            />
            <span className="sr-only sm:not-sr-only sm:inline">{socketLabel(connection)}</span>
          </button>
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-[min(18rem,90vw)] -translate-x-1/2 rounded-md border border-border bg-background px-2.5 py-1.5 text-left text-[11px] leading-snug text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          >
            {statusText}
          </span>
        </div>
      </footer>
    </main>
  );
}
