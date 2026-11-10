"use client";

import { useAuth } from "@clerk/nextjs";
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
  type MeResponse,
  type ServerErrorPayload,
} from "@dots/shared";
import { getSocket, resetSocket, setSocketTokenProvider } from "@/lib/socket";
import {
  clearActiveGame,
  loadActiveGame,
  saveActiveGame,
} from "@/lib/player-id";
import { shouldPlayMoveSound } from "@/lib/sounds/move-dedupe";
import { playSfx } from "@/lib/sounds/player";
import { useGameStore } from "@/stores/game-store";

function finishedLabel(payload: GameFinishedPayload): string {
  const nick = (color: "blue" | "red") =>
    payload.state.nicknames[color] ?? (color === "blue" ? "Blue" : "Red");

  if (payload.reason === "resign") {
    return payload.winner
      ? `${nick(payload.winner)} wins by resign.`
      : "Game ended by resign.";
  }
  if (payload.reason === "landing") {
    if (!payload.winner) return "Grounding declared — draw.";
    return `${nick(payload.winner)} wins after grounding.`;
  }
  if (payload.reason === "board_full") {
    if (!payload.winner) return "Board full — draw.";
    return `${nick(payload.winner)} wins.`;
  }
  return "Game finished.";
}

/** Wire Socket.IO ↔ Zustand for lobby + play + reconnect (Clerk JWT auth). */
export function useGameSocket(): void {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const bound = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    setSocketTokenProvider(async () => {
      try {
        return (await getToken()) ?? null;
      } catch {
        return null;
      }
    });

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/me", { credentials: "include" });
        if (!res.ok || cancelled) return;
        const me = (await res.json()) as MeResponse;
        if (me.nickname) {
          useGameStore.getState().setNickname(me.nickname);
        }
      } catch {
        // Nickname chrome is best-effort; socket auth still requires nickname server-side.
      }
    })();

    const socket = getSocket();
    useGameStore.getState().setConnection(socket.connected ? "connected" : "connecting");

    const onConnect = () => {
      useGameStore.getState().setConnection(
        useGameStore.getState().gameId ? useGameStore.getState().connection : "connected",
      );
      const { gameId } = useGameStore.getState();
      const session = loadActiveGame();
      const id = gameId ?? session?.gameId;
      if (id) {
        socket.emit(SocketEvents.gameSync, { gameId: id });
      }
    };

    const onDisconnect = () => {
      useGameStore.getState().setConnection("connecting");
    };

    const onConnectError = (err: Error) => {
      const msg = err.message || "Connection failed";
      if (msg.includes("NICKNAME_REQUIRED")) {
        useGameStore.getState().setError("Set a nickname before playing.");
      } else if (msg.includes("UNAUTHORIZED")) {
        useGameStore.getState().setError("Sign in required.");
      } else {
        useGameStore.getState().setError(msg);
      }
    };

    const onStarted = (payload: GameStartedPayload) => {
      useGameStore.getState().applyStarted({
        gameId: payload.gameId,
        yourColor: payload.color,
        state: payload.state,
        roomCode: payload.roomCode,
        startedAt: payload.startedAt ?? null,
        finishedAt: payload.finishedAt ?? null,
      });
      saveActiveGame({ gameId: payload.gameId, roomCode: payload.roomCode });
    };

    const onFound = (payload: MatchmakingFoundPayload) => {
      useGameStore.getState().applyStarted({
        gameId: payload.gameId,
        yourColor: payload.color,
        state: payload.state,
        startedAt: payload.startedAt ?? null,
        finishedAt: payload.finishedAt ?? null,
      });
      saveActiveGame({ gameId: payload.gameId });
    };

    const onState = (payload: GameStatePayload) => {
      useGameStore.getState().applyState(payload.state, payload.yourColor, {
        startedAt: payload.startedAt,
        finishedAt: payload.finishedAt,
      });
      if (payload.state.board.cells.length > 0) {
        const prev = loadActiveGame();
        const roomCode =
          useGameStore.getState().roomCode ?? prev?.roomCode ?? undefined;
        saveActiveGame({
          gameId: payload.state.gameId,
          ...(roomCode ? { roomCode } : {}),
        });
      }
    };

    const onAccepted = (payload: GameMoveAcceptedPayload) => {
      const gameId =
        useGameStore.getState().gameId ?? payload.state.gameId;
      if (
        shouldPlayMoveSound({
          gameId,
          moveNumber: payload.move.moveNumber,
          requestId: payload.requestId,
        })
      ) {
        playSfx("placeDot");
      }
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
      useGameStore.getState().setFinished(finishedLabel(payload), payload.state, {
        startedAt: payload.startedAt,
        finishedAt: payload.finishedAt,
      });
      clearActiveGame();
    };

    const onError = (payload: ServerErrorPayload) => {
      if (payload.code === "GAME_NOT_FOUND") {
        clearActiveGame();
        useGameStore.getState().resetMatch();
      }
      useGameStore.getState().setError(payload.message);
    };

    if (!bound.current) {
      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      socket.on("connect_error", onConnectError);
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
      cancelled = true;
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
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
      setSocketTokenProvider(null);
      // Keep the socket connected across lobby ↔ game navigations;
      // only clear provider so a remount can re-bind getToken.
      void resetSocket;
    };
  }, [getToken, isLoaded, isSignedIn]);
}

export function findMatch(): void {
  useGameStore.getState().setConnection("matchmaking");
  getSocket().emit(SocketEvents.matchmakingJoin, {});
}

export function cancelMatchmaking(): void {
  getSocket().emit(SocketEvents.matchmakingCancel, {});
  useGameStore.getState().setConnection("connected");
}

export function createPrivateRoom(): void {
  getSocket().emit(
    SocketEvents.gameCreate,
    {},
    (ack: GameCreateAck) => {
      useGameStore.getState().setLobby({
        gameId: ack.gameId,
        roomCode: ack.roomCode,
        yourColor: ack.color,
        playerId: ack.playerId,
      });
      saveActiveGame({ gameId: ack.gameId, roomCode: ack.roomCode });
    },
  );
}

export function joinPrivateRoom(gameIdOrCode: string): void {
  getSocket().emit(SocketEvents.gameJoin, {
    gameId: gameIdOrCode.trim(),
  });
}

export function syncGame(gameId: string): void {
  getSocket().emit(SocketEvents.gameSync, { gameId });
}

export function submitMove(x: number, y: number): void {
  const store = useGameStore.getState();
  const { gameId, state, yourColor, pending, connection } = store;
  if (!gameId || !state || !yourColor) return;
  if (connection !== "playing") return;
  if (pending) return;
  if (state.currentPlayer !== yourColor) return;
  if (state.board.cells.length === 0) return;

  const requestId = crypto.randomUUID();
  const expectedVersion = state.version;
  store.setPending({ requestId, x, y, color: yourColor, expectedVersion });
  getSocket().emit(SocketEvents.gameMove, {
    gameId,
    x,
    y,
    expectedVersion,
    requestId,
  });
}

export function resignGame(): void {
  const { gameId } = useGameStore.getState();
  if (!gameId) return;
  getSocket().emit(SocketEvents.gameResign, { gameId });
}

export function declareLandingGame(): void {
  const { gameId } = useGameStore.getState();
  if (!gameId) return;
  getSocket().emit(SocketEvents.gameLanding, { gameId });
}

/**
 * Soft navigate to lobby: keep localStorage session for Resume; clear Zustand
 * so the lobby does not immediately bounce back into /game/:id.
 */
export function parkGameSession(): void {
  const { gameId, roomCode } = useGameStore.getState();
  if (gameId) {
    const prev = loadActiveGame();
    saveActiveGame({
      gameId,
      roomCode: roomCode ?? prev?.roomCode,
    });
  }
  useGameStore.getState().resetMatch();
}

/**
 * Explicit leave (private + matchmaking):
 * server frees waiting seat / destroys empty room, or resigns if in progress.
 * Clears local session so Lobby no longer offers Resume for this game.
 */
export function leaveGame(opts?: { gameId?: string }): void {
  const store = useGameStore.getState();
  const gameId = opts?.gameId ?? store.gameId;
  if (gameId) {
    getSocket().emit(SocketEvents.gameLeave, { gameId });
  }
  clearActiveGame();
  useGameStore.getState().resetMatch();
}
