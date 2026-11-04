import type { Server, Socket } from "socket.io";
import {
  GameCreatePayloadSchema,
  GameJoinPayloadSchema,
  GameLandingPayloadSchema,
  GameMovePayloadSchema,
  GameResignPayloadSchema,
  GameSyncPayloadSchema,
  MatchmakingCancelPayloadSchema,
  MatchmakingJoinPayloadSchema,
  SocketEvents,
  type GameCreateAck,
  type ServerErrorPayload,
  type WireGameState,
} from "@dots/shared";
import { matchmakingQueue } from "../matchmaking/queue.js";
import { rooms, type ActiveGame } from "../game/rooms.js";

function emitError(socket: Socket, payload: ServerErrorPayload): void {
  socket.emit(SocketEvents.serverError, payload);
}

function roomName(gameId: string): string {
  return `game:${gameId}`;
}

function joinSocketRoom(socket: Socket, gameId: string): void {
  void socket.join(roomName(gameId));
}

function broadcastFinished(io: Server, game: ActiveGame): void {
  const state = rooms.wire(game);
  if (!state || !game.finishedReason) return;
  io.to(roomName(game.id)).emit(SocketEvents.gameFinished, {
    gameId: game.id,
    reason: game.finishedReason,
    winner: game.winner,
    state,
  });
}

function emitStartedToSeats(io: Server, game: ActiveGame, state: WireGameState): void {
  for (const color of ["blue", "red"] as const) {
    const seat = game.seats[color];
    if (!seat?.socketId) continue;
    const target = io.sockets.sockets.get(seat.socketId);
    if (!target) continue;
    joinSocketRoom(target, game.id);
    target.emit(SocketEvents.gameStarted, {
      gameId: game.id,
      color,
      state,
      roomCode: game.roomCode ?? undefined,
    });
    target.emit(SocketEvents.gameState, { state, yourColor: color });
  }
}

export function registerSocketHandlers(io: Server, socket: Socket): void {
  socket.on(SocketEvents.matchmakingJoin, (raw: unknown) => {
    const parsed = MatchmakingJoinPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      emitError(socket, { code: "INVALID_PAYLOAD", message: "Invalid matchmaking:join" });
      return;
    }

    const { playerId, displayName } = parsed.data;
    const existing = rooms.findByPlayer(playerId);
    if (existing && existing.status !== "finished") {
      const color = rooms.attachSocket(existing, playerId, socket.id);
      joinSocketRoom(socket, existing.id);
      const state = rooms.wire(existing);
      if (state && color) {
        socket.emit(SocketEvents.gameState, { state, yourColor: color });
      }
      return;
    }

    const result = matchmakingQueue.enqueue({
      playerId,
      displayName,
      socketId: socket.id,
    });

    if (!result.paired) return;

    void rooms
      .createMatchmakingGame({
        blue: {
          playerId: result.blue.playerId,
          displayName: result.blue.displayName,
          socketId: result.blue.socketId,
        },
        red: {
          playerId: result.red.playerId,
          displayName: result.red.displayName,
          socketId: result.red.socketId,
        },
      })
      .then((game) => {
        const state = rooms.wire(game)!;
        for (const color of ["blue", "red"] as const) {
          const seat = game.seats[color]!;
          const target = io.sockets.sockets.get(seat.socketId ?? "");
          if (!target) continue;
          joinSocketRoom(target, game.id);
          target.emit(SocketEvents.matchmakingFound, {
            gameId: game.id,
            color,
            state,
          });
          target.emit(SocketEvents.gameStarted, {
            gameId: game.id,
            color,
            state,
          });
          target.emit(SocketEvents.gameState, { state, yourColor: color });
        }
      })
      .catch((err: unknown) => {
        console.error("[matchmaking] failed to create game", err);
        emitError(socket, { code: "INTERNAL", message: "Failed to create match" });
      });
  });

  socket.on(SocketEvents.matchmakingCancel, (raw: unknown) => {
    const parsed = MatchmakingCancelPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      emitError(socket, { code: "INVALID_PAYLOAD", message: "Invalid matchmaking:cancel" });
      return;
    }
    matchmakingQueue.remove(parsed.data.playerId);
  });

  socket.on(SocketEvents.gameCreate, (raw: unknown, ack?: (res: GameCreateAck) => void) => {
    const parsed = GameCreatePayloadSchema.safeParse(raw);
    if (!parsed.success) {
      emitError(socket, { code: "INVALID_PAYLOAD", message: "Invalid game:create" });
      return;
    }

    void rooms
      .createPrivateRoom({
        playerId: parsed.data.playerId,
        displayName: parsed.data.displayName,
        socketId: socket.id,
      })
      .then(({ game, color, roomCode }) => {
        joinSocketRoom(socket, game.id);
        const payload: GameCreateAck = {
          gameId: game.id,
          roomCode,
          color,
        };
        ack?.(payload);
        // Lobby only — full board arrives on game:started when opponent joins.
        socket.emit(SocketEvents.gameStarted, {
          gameId: game.id,
          color,
          roomCode,
          // Minimal placeholder until engine starts; clients treat empty cells as lobby.
          state: {
            gameId: game.id,
            ruleset: "classic",
            rulesetVersion: "2017.1",
            board: { width: 39, height: 32, cells: [] },
            currentPlayer: "blue",
            players: {
              blue: parsed.data.playerId,
              // Placeholder until seat filled — valid UUID for schema consumers.
              red: "00000000-0000-4000-8000-000000000000",
            },
            scores: { blue: 0, red: 0 },
            version: 0,
            status: "in_progress",
            winner: null,
          },
        });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "create failed";
        emitError(socket, {
          code: "INTERNAL",
          message,
        });
      });
  });

  socket.on(SocketEvents.gameJoin, (raw: unknown) => {
    const parsed = GameJoinPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      emitError(socket, { code: "INVALID_PAYLOAD", message: "Invalid game:join" });
      return;
    }

    void rooms
      .joinPrivateRoom({
        gameIdOrCode: parsed.data.gameId,
        playerId: parsed.data.playerId,
        displayName: parsed.data.displayName,
        socketId: socket.id,
      })
      .then(({ game, color, justStarted }) => {
        joinSocketRoom(socket, game.id);
        const state = rooms.wire(game);

        if (justStarted && state) {
          emitStartedToSeats(io, game, state);
          return;
        }

        if (state) {
          // Reconnect into an in-progress (or finished) game.
          socket.emit(SocketEvents.gameState, { state, yourColor: color });
          socket.to(roomName(game.id)).emit(SocketEvents.gameOpponentReconnected, {
            gameId: game.id,
            playerId: parsed.data.playerId,
            color,
          });
          if (game.status === "finished" && game.finishedReason) {
            socket.emit(SocketEvents.gameFinished, {
              gameId: game.id,
              reason: game.finishedReason,
              winner: game.winner,
              state,
            });
          }
          return;
        }

        // Still waiting for second seat — confirm seat to joiner.
        socket.emit(SocketEvents.gameStarted, {
          gameId: game.id,
          color,
          roomCode: game.roomCode ?? undefined,
          state: {
            gameId: game.id,
            ruleset: "classic",
            rulesetVersion: "2017.1",
            board: { width: 39, height: 32, cells: [] },
            currentPlayer: "blue",
            players: {
              blue: game.seats.blue?.playerId ?? "00000000-0000-4000-8000-000000000000",
              red: game.seats.red?.playerId ?? "00000000-0000-4000-8000-000000000001",
            },
            scores: { blue: 0, red: 0 },
            version: 0,
            status: "in_progress",
            winner: null,
          },
        });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "join failed";
        const code =
          message === "GAME_NOT_FOUND"
            ? "GAME_NOT_FOUND"
            : message === "ROOM_FULL"
              ? "ROOM_FULL"
              : message === "GAME_NOT_IN_PROGRESS"
                ? "GAME_NOT_IN_PROGRESS"
                : "INTERNAL";
        emitError(socket, { code, message });
      });
  });

  socket.on(SocketEvents.gameSync, (raw: unknown) => {
    const parsed = GameSyncPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      emitError(socket, { code: "INVALID_PAYLOAD", message: "Invalid game:sync" });
      return;
    }

    const game = rooms.get(parsed.data.gameId) ?? rooms.findByRoomCode(parsed.data.gameId);
    if (!game) {
      emitError(socket, { code: "GAME_NOT_FOUND", message: "Game not found" });
      return;
    }

    const color = rooms.attachSocket(game, parsed.data.playerId, socket.id);
    if (!color) {
      emitError(socket, { code: "NOT_IN_GAME", message: "Not a player in this game" });
      return;
    }

    joinSocketRoom(socket, game.id);
    const state = rooms.wire(game);
    if (state) {
      socket.emit(SocketEvents.gameState, { state, yourColor: color });
      socket.to(roomName(game.id)).emit(SocketEvents.gameOpponentReconnected, {
        gameId: game.id,
        playerId: parsed.data.playerId,
        color,
      });
    }

    if (game.status === "finished" && state && game.finishedReason) {
      socket.emit(SocketEvents.gameFinished, {
        gameId: game.id,
        reason: game.finishedReason,
        winner: game.winner,
        state,
      });
    }
  });

  socket.on(SocketEvents.gameMove, (raw: unknown) => {
    const parsed = GameMovePayloadSchema.safeParse(raw);
    if (!parsed.success) {
      emitError(socket, { code: "INVALID_PAYLOAD", message: "Invalid game:move" });
      return;
    }

    const result = rooms.applyPlayerMove(parsed.data);

    if (result.kind === "rejected") {
      socket.emit(SocketEvents.gameMoveRejected, result.payload);
      return;
    }

    // Broadcast accepted move + authoritative state to the Socket.IO room.
    io.to(roomName(result.game.id)).emit(SocketEvents.gameMoveAccepted, result.payload);
    for (const color of ["blue", "red"] as const) {
      const seat = result.game.seats[color];
      if (!seat?.socketId) continue;
      const target = io.sockets.sockets.get(seat.socketId);
      target?.emit(SocketEvents.gameState, {
        state: result.payload.state,
        yourColor: color,
      });
    }

    if (result.game.status === "finished") {
      broadcastFinished(io, result.game);
    }
  });

  socket.on(SocketEvents.gameResign, (raw: unknown) => {
    const parsed = GameResignPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      emitError(socket, { code: "INVALID_PAYLOAD", message: "Invalid game:resign" });
      return;
    }

    const game = rooms.resign(parsed.data.gameId, parsed.data.playerId);
    if (!game) {
      emitError(socket, {
        code: "GAME_NOT_IN_PROGRESS",
        message: "Cannot resign this game",
      });
      return;
    }

    broadcastFinished(io, game);
  });

  socket.on(SocketEvents.gameLanding, (raw: unknown) => {
    const parsed = GameLandingPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      emitError(socket, { code: "INVALID_PAYLOAD", message: "Invalid game:landing" });
      return;
    }

    const game = rooms.declarePlayerLanding(parsed.data.gameId, parsed.data.playerId);
    if (!game) {
      emitError(socket, {
        code: "GAME_NOT_IN_PROGRESS",
        message: "Cannot declare landing for this game",
      });
      return;
    }

    broadcastFinished(io, game);
  });

  socket.on("disconnect", () => {
    matchmakingQueue.removeBySocket(socket.id);
    const left = rooms.markDisconnected(socket.id);
    if (!left) return;

    socket.to(roomName(left.game.id)).emit(SocketEvents.gameOpponentDisconnected, {
      gameId: left.game.id,
      playerId: left.playerId,
      color: left.color,
    });
  });
}
