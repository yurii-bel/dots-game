"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GameTimer } from "@/components/game/GameTimer";
import {
  declareLandingGame,
  leaveGame,
  parkGameSession,
  resignGame,
} from "@/hooks/use-game-socket";
import { isSfxMuted, setSfxMuted, unlockSfx } from "@/lib/sounds/player";
import { useGameStore } from "@/stores/game-store";

function ScoreDot({ color }: { color: "blue" | "red" }) {
  return (
    <span
      aria-hidden
      className={
        color === "blue"
          ? "inline-block size-2.5 rounded-full bg-blue-700"
          : "inline-block size-2.5 rounded-full bg-red-600"
      }
    />
  );
}

export function GameChrome() {
  const router = useRouter();
  const connection = useGameStore((s) => s.connection);
  const yourColor = useGameStore((s) => s.yourColor);
  const state = useGameStore((s) => s.state);
  const roomCode = useGameStore((s) => s.roomCode);
  const opponentConnected = useGameStore((s) => s.opponentConnected);
  const lastError = useGameStore((s) => s.lastError);
  const finishedMessage = useGameStore((s) => s.finishedMessage);
  const pending = useGameStore((s) => s.pending);
  const nickname = useGameStore((s) => s.nickname);
  const [sfxMuted, setSfxMutedUi] = useState(false);

  useEffect(() => {
    setSfxMutedUi(isSfxMuted());
  }, []);

  const turnLabel = !state
    ? "—"
    : state.status === "finished"
      ? "Finished"
      : state.currentPlayer === yourColor
        ? "Your turn"
        : "Opponent’s turn";

  const canLeave =
    connection === "waiting" ||
    connection === "playing" ||
    connection === "finished" ||
    connection === "error";

  const blueName = state?.nicknames.blue ?? "Blue";
  const redName = state?.nicknames.red ?? "Red";

  return (
    <header className="flex flex-col gap-3 border-b border-border/80 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">DOTS · 1v1</p>
          {nickname ? (
            <span className="text-xs text-muted-foreground">{nickname}</span>
          ) : null}
          <UserButton />
        </div>
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {yourColor ? (
              <>
                You are{" "}
                <span className={yourColor === "blue" ? "text-blue-700" : "text-red-600"}>
                  {yourColor === "blue" ? blueName : redName}
                </span>
              </>
            ) : (
              "Game"
            )}
          </h1>
          <span className="text-sm text-muted-foreground">{turnLabel}</span>
          <GameTimer />
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <ScoreDot color="blue" />
            <span className="font-medium">{blueName}</span>
            <span>{state?.scores.blue ?? 0}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ScoreDot color="red" />
            <span className="font-medium">{redName}</span>
            <span>{state?.scores.red ?? 0}</span>
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={sfxMuted}
          aria-label={sfxMuted ? "Unmute sound effects" : "Mute sound effects"}
          title={sfxMuted ? "Unmute sounds" : "Mute sounds"}
          onClick={() => {
            unlockSfx();
            const next = !isSfxMuted();
            setSfxMuted(next);
            setSfxMutedUi(next);
          }}
        >
          {sfxMuted ? (
            <VolumeX className="size-4" aria-hidden />
          ) : (
            <Volume2 className="size-4" aria-hidden />
          )}
          <span className="sm:inline">{sfxMuted ? "Muted" : "Sound"}</span>
        </Button>
        {connection === "playing" ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              title="One-time action. Continuous chains connected to the outer boundary become permanently safe. Remaining floating material that the opponent could theoretically surround is forfeited to them; then the game ends and the final score is computed."
              onClick={() => declareLandingGame()}
            >
              Declare grounding
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => resignGame()}>
              Resign
            </Button>
          </>
        ) : null}
        {/* Soft navigate — parks Zustand, keeps localStorage for Resume. */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            parkGameSession();
            router.push("/lobby");
          }}
        >
          Lobby
        </Button>
        {canLeave ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              leaveGame();
              router.push("/lobby");
            }}
          >
            Leave
          </Button>
        ) : null}
      </div>
    </header>
  );
}
