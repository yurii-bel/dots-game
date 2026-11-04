"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { GameView } from "@/components/game/GameView";
import { joinPrivateRoom, syncGame } from "@/hooks/use-game-socket";
import { useGameStore } from "@/stores/game-store";
import { getOrCreatePlayerId } from "@/lib/player-id";

export default function GamePage() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;
  const storeGameId = useGameStore((s) => s.gameId);
  const playerId = useGameStore((s) => s.playerId);

  useEffect(() => {
    // Ensure identity exists before join/sync (GameView mounts socket hook).
    if (!playerId) {
      useGameStore.getState().setIdentity(getOrCreatePlayerId(), "Player");
    }
  }, [playerId]);

  useEffect(() => {
    if (!gameId) return;
    const pid = useGameStore.getState().playerId ?? getOrCreatePlayerId();
    if (!useGameStore.getState().playerId) {
      useGameStore.getState().setIdentity(pid, "Player");
    }

    // If we already know this seat, sync; otherwise join by id/code (reconnect-safe).
    if (storeGameId === gameId) {
      syncGame(gameId);
    } else {
      joinPrivateRoom(gameId);
    }
  }, [gameId, storeGameId]);

  return <GameView />;
}
