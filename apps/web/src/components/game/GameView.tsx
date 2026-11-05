"use client";

import { useEffect } from "react";
import { GameBoard } from "@/components/game/GameBoard";
import { GameChrome } from "@/components/game/GameChrome";
import { submitMove, useGameSocket } from "@/hooks/use-game-socket";
import { unlockSfx } from "@/lib/sounds/player";
import { useGameStore } from "@/stores/game-store";
import { DEFAULT_BOARD_HEIGHT, DEFAULT_BOARD_WIDTH } from "@dots/shared";

const emptyBoard = {
  width: DEFAULT_BOARD_WIDTH,
  height: DEFAULT_BOARD_HEIGHT,
  cells: [] as [],
};

export function GameView() {
  useGameSocket();

  const state = useGameStore((s) => s.state);
  const yourColor = useGameStore((s) => s.yourColor);
  const pending = useGameStore((s) => s.pending);
  const connection = useGameStore((s) => s.connection);

  // Unlock audio on first gesture so opponent moves can play under autoplay rules.
  useEffect(() => {
    const unlock = () => unlockSfx();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const board = state?.board.cells.length ? state.board : emptyBoard;
  const myTurn =
    connection === "playing" &&
    !!state &&
    state.status === "in_progress" &&
    state.currentPlayer === yourColor &&
    !pending;

  return (
    <div className="mx-auto flex h-[100dvh] max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6">
      <GameChrome />
      <div className="min-h-0 flex-1">
        <GameBoard
          board={board}
          interactive={myTurn}
          yourColor={yourColor}
          pending={pending}
          onPlace={(x, y) => submitMove(x, y)}
        />
      </div>
    </div>
  );
}
