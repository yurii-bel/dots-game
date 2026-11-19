"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClassicalTitleBadge } from "@/components/game/ClassicalTitleBadge";
import { GameTimer } from "@/components/game/GameTimer";
import {
  declareLandingGame,
  leaveGame,
  parkGameSession,
  resignGame,
} from "@/hooks/use-game-socket";
import { isSfxMuted, setSfxMuted, unlockSfx } from "@/lib/sounds/player";
import { useGameStore } from "@/stores/game-store";

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
  const classicalTitle = useGameStore((s) => s.classicalTitle);
  const classicalRating = useGameStore((s) => s.classicalRating);
  const [sfxMuted, setSfxMutedUi] = useState(false);

  useEffect(() => {
    setSfxMutedUi(isSfxMuted());
  }, []);

  const canLeave =
    connection === "waiting" ||
    connection === "playing" ||
    connection === "finished" ||
    connection === "error";

  const blueName = state?.nicknames.blue ?? "Blue";
  const redName = state?.nicknames.red ?? "Red";
  const winner = state?.status === "finished" ? (state.winner ?? null) : null;
  const finished = connection === "finished" || state?.status === "finished";

  return (
    <header className="flex flex-col gap-3 border-b border-border/80 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">DOTS · 1v1</p>
          {nickname ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{nickname}</span>
              <ClassicalTitleBadge
                title={classicalTitle}
                className="size-5 text-[10px]"
              />
              {classicalRating != null ? (
                <span className="tabular-nums" title="Classical rating">
                  {classicalRating}
                </span>
              ) : null}
            </span>
          ) : null}
          {yourColor ? (
            <span className="text-xs text-muted-foreground">
              You ·{" "}
              <span className={yourColor === "blue" ? "text-blue-700" : "text-red-600"}>
                {yourColor === "blue" ? blueName : redName}
              </span>
            </span>
          ) : null}
          <UserButton />
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
          <Button type="button" variant="ghost" size="sm" asChild>
            <Link href="/faq">FAQ</Link>
          </Button>
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
      </div>

      {/* Tensu-like row: blue name · clocks · red name */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:gap-4">
        <div className="min-w-0 text-left">
          <p className="truncate text-lg font-semibold tracking-tight text-blue-700 sm:text-xl">
            {blueName}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{state?.scores.blue ?? 0}</span>
            {winner === "blue" ? (
              <span className="ml-2 font-semibold text-blue-700">Winner</span>
            ) : null}
          </p>
        </div>

        <div className="flex flex-col items-center gap-1 pt-0.5">
          <GameTimer />
          {roomCode ? (
            <span className="text-[11px] text-muted-foreground">
              Room{" "}
              <code className="rounded bg-secondary px-1 py-0.5 text-foreground">{roomCode}</code>
            </span>
          ) : null}
        </div>

        <div className="min-w-0 text-right">
          <p className="truncate text-lg font-semibold tracking-tight text-red-600 sm:text-xl">
            {redName}
          </p>
          <p className="text-sm text-muted-foreground">
            {winner === "red" ? (
              <span className="mr-2 font-semibold text-red-600">Winner</span>
            ) : null}
            <span className="font-medium text-foreground">{state?.scores.red ?? 0}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>v{state?.version ?? 0}</span>
        {!opponentConnected && connection === "playing" ? (
          <span className="text-amber-700">Opponent disconnected…</span>
        ) : null}
        {pending ? <span>Sending move…</span> : null}
        {finished && !winner ? <span className="font-medium text-foreground">Draw</span> : null}
      </div>

      {lastError ? <p className="text-sm text-destructive">{lastError}</p> : null}
      {finishedMessage ? <p className="text-sm font-medium">{finishedMessage}</p> : null}
      {connection === "waiting" ? (
        <p className="text-sm text-muted-foreground">
          Waiting for opponent{roomCode ? ` — share code ${roomCode}` : ""}.
        </p>
      ) : null}
    </header>
  );
}
