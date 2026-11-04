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

type GameStore = {
  playerId: string | null;
  displayName: string;
  connection: ConnectionStatus;
  gameId: string | null;
  roomCode: string | null;
  yourColor: PlayerColor | null;
  state: WireGameState | null;
  pending: PendingMove | null;
  opponentConnected: boolean;
  lastError: string | null;
  finishedMessage: string | null;

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
  }) => void;
  applyState: (state: WireGameState, yourColor?: PlayerColor | null) => void;
  setPending: (pending: PendingMove | null) => void;
  confirmMove: (payload: GameMoveAcceptedPayload) => void;
  rejectMove: (payload: GameMoveRejectedPayload) => void;
  setOpponentConnected: (connected: boolean) => void;
  setError: (message: string | null) => void;
  setFinished: (message: string, state: WireGameState) => void;
  resetMatch: () => void;
};

export const useGameStore = create<GameStore>((set, get) => ({
  playerId: null,
  displayName: "Player",
  connection: "idle",
  gameId: null,
  roomCode: null,
  yourColor: null,
  state: null,
  pending: null,
  opponentConnected: true,
  lastError: null,
  finishedMessage: null,

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
    }),

  applyStarted: ({ gameId, yourColor, state, roomCode }) =>
    set({
      gameId,
      yourColor,
      state,
      roomCode: roomCode ?? get().roomCode,
      connection: state.board.cells.length > 0 ? "playing" : "waiting",
      pending: null,
      lastError: null,
      finishedMessage: null,
      opponentConnected: true,
    }),

  applyState: (state, yourColor) =>
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

  setFinished: (finishedMessage, state) =>
    set({
      finishedMessage,
      state,
      connection: "finished",
      pending: null,
    }),

  resetMatch: () =>
    set({
      connection: "idle",
      gameId: null,
      roomCode: null,
      yourColor: null,
      state: null,
      pending: null,
      opponentConnected: true,
      lastError: null,
      finishedMessage: null,
    }),
}));
