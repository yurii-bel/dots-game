"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { RequireNickname } from "@/components/auth/RequireNickname";
import { GameView } from "@/components/game/GameView";
import { joinPrivateRoom, syncGame } from "@/hooks/use-game-socket";
import { useGameStore } from "@/stores/game-store";

function GamePageInner() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;
  const storeGameId = useGameStore((s) => s.gameId);

  useEffect(() => {
    if (!gameId) return;

    // If we already know this seat, sync; otherwise join by id/code (reconnect-safe).
    if (storeGameId === gameId) {
      syncGame(gameId);
    } else {
      joinPrivateRoom(gameId);
    }
  }, [gameId, storeGameId]);

  return <GameView />;
}

export default function GamePage() {
  return (
    <RequireNickname>
      <GamePageInner />
    </RequireNickname>
  );
}
