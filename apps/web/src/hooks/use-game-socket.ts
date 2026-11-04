"use client";

import { useEffect, useRef } from "react";
import {
  SocketEvents,
  type GameCreateAck,
  type GameFinishedPayload,
  type GameMoveAcceptedPayload,
  type GameMoveRejectedPayload,
  type GameStartedPayload,
  type GameStatePayload,
  type MatchmakingFoundPayload,
  type ServerErrorPayload,
} from "@dots/shared";
import { getSocket } from "@/lib/socket";
import {
  clearActiveGame,
  getDisplayName,
  getOrCreatePlayerId,
  loadActiveGame,
  saveActiveGame,
} from "@/lib/player-id";
import { useGameStore } from "@/stores/game-store";

function finishedLabel(payload: GameFinishedPayload): string {
  if (payload.reason === "resign") {
    return payload.winner
      ? `${payload.winner === "blue" ? "Blue" : "Red"} wins by resign.`
      : "Game ended by resign.";
  }
  if (payload.reason === "board_full") {
    if (!payload.winner) return "Board full — draw.";
    return `${payload.winner === "blue" ? "Blue" : "Red"} wins.`;
  }
  return "Game finished.";
}

/** Wire Socket.IO ↔ Zustand for lobby + play + reconnect. */
export function useGameSocket(): void {
  const bound = useRef(false);

  useEffect(() => {
    const playerId = getOrCreatePlayerId();
    const displayName = getDisplayName();
    useGameStore.getState().setIdentity(playerId, displayName);

    const socket = getSocket();
    useGameStore.getState().setConnection(socket.connected ? "connected" : "connecting");

    const onConnect = () => {
      useGameStore.getState().setConnection(
        useGameStore.getState().gameId ? useGameStore.getState().connection : "connected",
      );
      // Re-sync after reconnect if we have an active game.
      const { gameId, playerId: pid } = useGameStore.getState();
      const session = loadActiveGame();
      const id = gameId ?? session?.gameId;
      if (id && pid) {
        socket.emit(SocketEvents.gameSync, { gameId: id, playerId: pid });
      }
    };

    const onDisconnect = () => {
      useGameStore.getState().setConnection("connecting");
    };

    const onStarted = (payload: GameStartedPayload) => {
      useGameStore.getState().applyStarted({
        gameId: payload.gameId,
        yourColor: payload.color,
        state: payload.state,
        roomCode: payload.roomCode,
      });
      saveActiveGame({ gameId: payload.gameId, roomCode: payload.roomCode });
    };

    const onFound = (payload: MatchmakingFoundPayload) => {
      useGameStore.getState().applyStarted({
        gameId: payload.gameId,
        yourColor: payload.color,
        state: payload.state,
      });
      saveActiveGame({ gameId: payload.gameId });
    };

    const onState = (payload: GameStatePayload) => {
      useGameStore.getState().applyState(payload.state, payload.yourColor);
      if (payload.state.board.cells.length > 0) {
        saveActiveGame({ gameId: payload.state.gameId });
      }
    };

    const onAccepted = (payload: GameMoveAcceptedPayload) => {
      useGameStore.getState().confirmMove(payload);
    };

    const onRejected = (payload: GameMoveRejectedPayload) => {
      useGameStore.getState().rejectMove(payload);
    };

    const onOppDisc = () => {
      useGameStore.getState().setOpponentConnected(false);
    };

    const onOppRec = () => {
      useGameStore.getState().setOpponentConnected(true);
    };

    const onFinished = (payload: GameFinishedPayload) => {
      useGameStore.getState().setFinished(finishedLabel(payload), payload.state);
      clearActiveGame();
    };

    const onError = (payload: ServerErrorPayload) => {
      useGameStore.getState().setError(payload.message);
    };

    if (!bound.current) {
      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      socket.on(SocketEvents.gameStarted, onStarted);
      socket.on(SocketEvents.matchmakingFound, onFound);
      socket.on(SocketEvents.gameState, onState);
      socket.on(SocketEvents.gameMoveAccepted, onAccepted);
      socket.on(SocketEvents.gameMoveRejected, onRejected);
      socket.on(SocketEvents.gameOpponentDisconnected, onOppDisc);
      socket.on(SocketEvents.gameOpponentReconnected, onOppRec);
      socket.on(SocketEvents.gameFinished, onFinished);
      socket.on(SocketEvents.serverError, onError);
      bound.current = true;
    }

    if (socket.connected) onConnect();
    else socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off(SocketEvents.gameStarted, onStarted);
      socket.off(SocketEvents.matchmakingFound, onFound);
      socket.off(SocketEvents.gameState, onState);
      socket.off(SocketEvents.gameMoveAccepted, onAccepted);
      socket.off(SocketEvents.gameMoveRejected, onRejected);
      socket.off(SocketEvents.gameOpponentDisconnected, onOppDisc);
      socket.off(SocketEvents.gameOpponentReconnected, onOppRec);
      socket.off(SocketEvents.gameFinished, onFinished);
      socket.off(SocketEvents.serverError, onError);
      bound.current = false;
    };
  }, []);
}

export function findMatch(): void {
  const { playerId, displayName } = useGameStore.getState();
  if (!playerId) return;
  useGameStore.getState().setConnection("matchmaking");
  getSocket().emit(SocketEvents.matchmakingJoin, { playerId, displayName });
}

export function cancelMatchmaking(): void {
  const { playerId } = useGameStore.getState();
  if (!playerId) return;
  getSocket().emit(SocketEvents.matchmakingCancel, { playerId });
  useGameStore.getState().setConnection("connected");
}

export function createPrivateRoom(): void {
  const { playerId, displayName } = useGameStore.getState();
  if (!playerId) return;
  getSocket().emit(
    SocketEvents.gameCreate,
    { playerId, displayName },
    (ack: GameCreateAck) => {
      useGameStore.getState().setLobby({
        gameId: ack.gameId,
        roomCode: ack.roomCode,
        yourColor: ack.color,
      });
      saveActiveGame({ gameId: ack.gameId, roomCode: ack.roomCode });
    },
  );
}

export function joinPrivateRoom(gameIdOrCode: string): void {
  const { playerId, displayName } = useGameStore.getState();
  if (!playerId) return;
  getSocket().emit(SocketEvents.gameJoin, {
    gameId: gameIdOrCode.trim(),
    playerId,
    displayName,
  });
}

export function syncGame(gameId: string): void {
  const { playerId } = useGameStore.getState();
  if (!playerId) return;
  getSocket().emit(SocketEvents.gameSync, { gameId, playerId });
}

export function submitMove(x: number, y: number): void {
  const store = useGameStore.getState();
  const { playerId, gameId, state, yourColor, pending, connection } = store;
  if (!playerId || !gameId || !state || !yourColor) return;
  if (connection !== "playing") return;
  if (pending) return;
  if (state.currentPlayer !== yourColor) return;
  if (state.board.cells.length === 0) return;

  const requestId = crypto.randomUUID();
  const expectedVersion = state.version;
  store.setPending({ requestId, x, y, color: yourColor, expectedVersion });
  getSocket().emit(SocketEvents.gameMove, {
    gameId,
    playerId,
    x,
    y,
    expectedVersion,
    requestId,
  });
}

export function resignGame(): void {
  const { playerId, gameId } = useGameStore.getState();
  if (!playerId || !gameId) return;
  getSocket().emit(SocketEvents.gameResign, { gameId, playerId });
}
