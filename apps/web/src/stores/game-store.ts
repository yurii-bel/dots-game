"use client";

import { create } from "zustand";
import type {
  GameMoveAcceptedPayload,
  GameMoveRejectedPayload,
  PlayerColor,
  WireGameState,
} from "@dots/shared";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "matchmaking"
  | "waiting"
  | "playing"
  | "finished"
  | "error";

export type PendingMove = {
  requestId: string;
  x: number;
  y: number;
  color: PlayerColor;
  expectedVersion: number;
};

/** Last accepted placement — client UI only (Task 5 rings). Cleared on new match. */
export type LastMove = {
  x: number;
  y: number;
  color: PlayerColor;
  moveNumber: number;
};

type TimingInput = {
  startedAt?: number | null;
  finishedAt?: number | null;
};

type GameStore = {
  playerId: string | null;
  displayName: string;
  connection: ConnectionStatus;
  gameId: string | null;
  roomCode: string | null;
  yourColor: PlayerColor | null;
  state: WireGameState | null;
  pending: PendingMove | null;
  /** Highlight rings for the most recent accepted move (not on wire/sync). */
  lastMove: LastMove | null;
  opponentConnected: boolean;
  lastError: string | null;
  finishedMessage: string | null;
  /** Server epoch ms when play began; null while waiting. */
  startedAt: number | null;
  /** Server epoch ms when finished; null until then. */
  finishedAt: number | null;

  setIdentity: (playerId: string, displayName: string) => void;
  setConnection: (connection: ConnectionStatus) => void;
  setLobby: (input: {
    gameId: string;
    roomCode?: string | null;
    yourColor: PlayerColor;
  }) => void;
  applyStarted: (input: {
    gameId: string;
    yourColor: PlayerColor;
    state: WireGameState;
    roomCode?: string;
  } & TimingInput) => void;
  applyState: (
    state: WireGameState,
    yourColor?: PlayerColor | null,
    timing?: TimingInput,
  ) => void;
  setPending: (pending: PendingMove | null) => void;
  confirmMove: (payload: GameMoveAcceptedPayload) => void;
  rejectMove: (payload: GameMoveRejectedPayload) => void;
  setOpponentConnected: (connected: boolean) => void;
  setError: (message: string | null) => void;
  setFinished: (message: string, state: WireGameState, timing?: TimingInput) => void;
  resetMatch: () => void;
};

function nextTiming(
  current: { startedAt: number | null; finishedAt: number | null },
  timing?: TimingInput,
): { startedAt: number | null; finishedAt: number | null } {
  if (!timing) return current;
  return {
    startedAt:
      timing.startedAt === undefined
        ? current.startedAt
        : timing.startedAt,
    finishedAt:
      timing.finishedAt === undefined
        ? current.finishedAt
        : timing.finishedAt,
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  playerId: null,
  displayName: "Player",
  connection: "idle",
  gameId: null,
  roomCode: null,
  yourColor: null,
  state: null,
  pending: null,
  lastMove: null,
  opponentConnected: true,
  lastError: null,
  finishedMessage: null,
  startedAt: null,
  finishedAt: null,

  setIdentity: (playerId, displayName) => set({ playerId, displayName }),

  setConnection: (connection) => set({ connection }),

  setLobby: ({ gameId, roomCode, yourColor }) =>
    set({
      gameId,
      roomCode: roomCode ?? null,
      yourColor,
      connection: "waiting",
      lastError: null,
      finishedMessage: null,
      startedAt: null,
      finishedAt: null,
    }),

  applyStarted: ({ gameId, yourColor, state, roomCode, startedAt, finishedAt }) =>
    set({
      gameId,
      yourColor,
      state,
      roomCode: roomCode ?? get().roomCode,
      connection: state.board.cells.length > 0 ? "playing" : "waiting",
      pending: null,
      lastMove: null,
      lastError: null,
      finishedMessage: null,
      opponentConnected: true,
      ...nextTiming(get(), { startedAt, finishedAt }),
    }),

  applyState: (state, yourColor, timing) =>
    set({
      state,
      yourColor: yourColor === undefined ? get().yourColor : yourColor,
      connection:
        state.status === "finished"
          ? "finished"
          : state.board.cells.length > 0
            ? "playing"
            : get().connection,
      gameId: state.gameId,
      ...nextTiming(get(), timing),
    }),

  setPending: (pending) => set({ pending }),

  confirmMove: (payload) => {
    const pending = get().pending;
    if (pending && pending.requestId !== payload.requestId) {
      // Stale confirm — still apply authoritative state.
    }
    set({
      state: payload.state,
      pending: pending?.requestId === payload.requestId ? null : get().pending,
      lastMove: {
        x: payload.move.x,
        y: payload.move.y,
        color: payload.move.color,
        moveNumber: payload.move.moveNumber,
      },
      connection: payload.state.status === "finished" ? "finished" : "playing",
      lastError: null,
    });
  },

  rejectMove: (payload) => {
    const pending = get().pending;
    set({
      pending: pending?.requestId === payload.requestId ? null : pending,
      state: payload.state ?? get().state,
      lastError: payload.message,
      connection:
        payload.state?.status === "finished"
          ? "finished"
          : get().connection === "waiting"
            ? "waiting"
            : "playing",
    });
  },

  setOpponentConnected: (opponentConnected) => set({ opponentConnected }),

  setError: (lastError) =>
    set({ lastError, connection: lastError ? "error" : get().connection }),

  setFinished: (finishedMessage, state, timing) =>
    set({
      finishedMessage,
      state,
      connection: "finished",
      pending: null,
      ...nextTiming(get(), timing),
    }),

  resetMatch: () =>
    set({
      connection: "idle",
      gameId: null,
      roomCode: null,
      yourColor: null,
      state: null,
      pending: null,
      lastMove: null,
      opponentConnected: true,
      lastError: null,
      finishedMessage: null,
      startedAt: null,
      finishedAt: null,
    }),
}));
