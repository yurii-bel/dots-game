"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { APP_NAME } from "@dots/shared";
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
import { useGameStore } from "@/stores/game-store";

export function Lobby() {
  useGameSocket();
  const router = useRouter();
  const connection = useGameStore((s) => s.connection);
  const gameId = useGameStore((s) => s.gameId);
  const roomCode = useGameStore((s) => s.roomCode);
  const lastError = useGameStore((s) => s.lastError);
  const nickname = useGameStore((s) => s.nickname);
  const [joinCode, setJoinCode] = useState("");
  const [savedSession, setSavedSession] = useState<ActiveGameSession | null>(null);

  useEffect(() => {
    setSavedSession(loadActiveGame());
  }, []);

  // After create / join / match found — enter the game route (not a blind remount redirect).
  useEffect(() => {
    if (gameId && (connection === "playing" || connection === "waiting")) {
      router.push(`/game/${gameId}`);
    }
  }, [gameId, connection, router]);

  useEffect(() => {
    if (!gameId) {
      setSavedSession(loadActiveGame());
    }
  }, [gameId, connection]);

  const hasResume = Boolean(savedSession?.gameId) && !gameId;
  const busy =
    connection === "matchmaking" || connection === "waiting" || connection === "playing";

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 px-6 py-16">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
            Online 1v1
          </p>
          <h1 className="text-5xl font-semibold tracking-tight">{APP_NAME}</h1>
          <p className="text-lg text-muted-foreground">
            Classic Спортивные точки — Canvas board, server-authoritative Socket.IO.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 pt-1">
          {nickname ? (
            <span className="text-sm font-medium text-foreground">{nickname}</span>
          ) : null}
          <UserButton />
        </div>
      </div>

      {hasResume ? (
        <div className="flex flex-col gap-3 rounded-md border border-border/80 bg-secondary/30 p-4">
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

      <div className="flex flex-col gap-3">
        {connection === "matchmaking" ? (
          <Button type="button" variant="outline" onClick={() => cancelMatchmaking()}>
            Cancel matchmaking…
          </Button>
        ) : (
          <Button type="button" onClick={() => findMatch()} disabled={hasResume || busy}>
            Find match
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={() => createPrivateRoom()}
          disabled={hasResume || busy}
        >
          Create private room
        </Button>

        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Room code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            disabled={hasResume || busy}
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
        <p className="text-sm text-muted-foreground">
          Room ready — code <strong>{roomCode}</strong>. Waiting for opponent…
        </p>
      ) : null}

      {lastError ? <p className="text-sm text-destructive">{lastError}</p> : null}

      <p className="text-xs text-muted-foreground">
        <Link href="/" className="underline-offset-2 hover:underline">
          Home
        </Link>
        {" · "}
        Socket {getSocketUrl()} · status: {connection}
      </p>
    </main>
  );
}
