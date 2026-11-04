"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { APP_NAME } from "@dots/shared";
import { Button } from "@/components/ui/button";
import {
  cancelMatchmaking,
  createPrivateRoom,
  findMatch,
  joinPrivateRoom,
  useGameSocket,
} from "@/hooks/use-game-socket";
import {
  getDisplayName,
  loadActiveGame,
  setDisplayName as persistName,
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
  const [name, setName] = useState("Player");
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    setName(getDisplayName());
    const session = loadActiveGame();
    if (session?.gameId) {
      router.push(`/game/${session.gameId}`);
    }
  }, [router]);

  useEffect(() => {
    if (gameId && (connection === "playing" || connection === "waiting")) {
      router.push(`/game/${gameId}`);
    }
  }, [gameId, connection, router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Milestone 4 · online 1v1
        </p>
        <h1 className="text-5xl font-semibold tracking-tight">{APP_NAME}</h1>
        <p className="text-lg text-muted-foreground">
          Classic Спортивные точки — Canvas board, server-authoritative Socket.IO.
        </p>
      </div>

      <label className="block space-y-1.5 text-sm">
        <span className="text-muted-foreground">Display name</span>
        <input
          className="w-full rounded-md border border-input bg-background px-3 py-2"
          value={name}
          maxLength={32}
          onChange={(e) => {
            setName(e.target.value);
            persistName(e.target.value);
          }}
        />
      </label>

      <div className="flex flex-col gap-3">
        {connection === "matchmaking" ? (
          <Button type="button" variant="outline" onClick={() => cancelMatchmaking()}>
            Cancel matchmaking…
          </Button>
        ) : (
          <Button type="button" onClick={() => findMatch()}>
            Find match
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={() => createPrivateRoom()}
          disabled={connection === "matchmaking"}
        >
          Create private room
        </Button>

        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Room code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={!joinCode.trim()}
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
        Socket {getSocketUrl()} · status: {connection}
      </p>
    </main>
  );
}
