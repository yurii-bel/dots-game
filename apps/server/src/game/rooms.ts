import { randomBytes, randomUUID } from "node:crypto";
import {
  applyMove,
  declareLanding,
  initializeGame,
  type GameState,
  type PlayerColor,
} from "@dots/game-engine";
import {
  DEFAULT_BOARD_HEIGHT,
  DEFAULT_BOARD_WIDTH,
  type GameMoveAcceptedPayload,
  type GameMoveRejectedPayload,
  type WireGameState,
} from "@dots/shared";
import {
  persistGameCreated,
  persistGameFinished,
  persistGameStarted,
  persistMove,
  persistPlayerJoined,
} from "./persist.js";
import { toWireState } from "./wire.js";

export type Seat = {
  playerId: string;
  displayName: string;
  socketId: string | null;
  connected: boolean;
};

type MoveResultCache =
  | { kind: "accepted"; payload: GameMoveAcceptedPayload }
  | { kind: "rejected"; payload: GameMoveRejectedPayload };

export type ActiveGame = {
  id: string;
  roomCode: string | null;
  mode: "matchmaking" | "private";
  status: "waiting" | "in_progress" | "finished";
  seats: Partial<Record<PlayerColor, Seat>>;
  engine: GameState | null;
  winner: PlayerColor | null;
  finishedReason: "board_full" | "resign" | "disconnect_forfeit" | "landing" | null;
  /** requestId → prior move result (idempotency). */
  moveResults: Map<string, MoveResultCache>;
};

function roomCode(): string {
  return randomBytes(3).toString("hex").toUpperCase();
}

function newGameId(): string {
  return randomUUID();
}

export class GameRoomRegistry {
  private readonly games = new Map<string, ActiveGame>();
  private readonly byRoomCode = new Map<string, string>();
  private readonly playerToGame = new Map<string, string>();

  get(gameId: string): ActiveGame | undefined {
    return this.games.get(gameId);
  }

  findByRoomCode(code: string): ActiveGame | undefined {
    const id = this.byRoomCode.get(code.toUpperCase());
    return id ? this.games.get(id) : undefined;
  }

  findByPlayer(playerId: string): ActiveGame | undefined {
    const id = this.playerToGame.get(playerId);
    return id ? this.games.get(id) : undefined;
  }

  colorOf(game: ActiveGame, playerId: string): PlayerColor | null {
    if (game.seats.blue?.playerId === playerId) return "blue";
    if (game.seats.red?.playerId === playerId) return "red";
    return null;
  }

  wire(game: ActiveGame): WireGameState | null {
    if (!game.engine) return null;
    return toWireState(game.id, game.engine, game.winner);
  }

  async createPrivateRoom(input: {
    playerId: string;
    displayName?: string;
    socketId: string;
  }): Promise<{ game: ActiveGame; color: PlayerColor; roomCode: string }> {
    const existing = this.findByPlayer(input.playerId);
    if (existing && existing.status !== "finished") {
      throw new Error("ALREADY_IN_GAME");
    }

    const id = newGameId();
    const code = roomCode();
    const game: ActiveGame = {
      id,
      roomCode: code,
      mode: "private",
      status: "waiting",
      seats: {
        blue: {
          playerId: input.playerId,
          displayName: input.displayName ?? "Blue",
          socketId: input.socketId,
          connected: true,
        },
      },
      engine: null,
      winner: null,
      finishedReason: null,
      moveResults: new Map(),
    };

    this.games.set(id, game);
    this.byRoomCode.set(code, id);
    this.playerToGame.set(input.playerId, id);

    void persistGameCreated({
      gameId: id,
      roomCode: code,
      status: "waiting",
      ruleset: "classic",
      rulesetVersion: "2017.1",
      players: [
        {
          playerId: input.playerId,
          color: "blue",
          displayName: input.displayName,
        },
      ],
    });

    return { game, color: "blue", roomCode: code };
  }

  async joinPrivateRoom(input: {
    gameIdOrCode: string;
    playerId: string;
    displayName?: string;
    socketId: string;
  }): Promise<{ game: ActiveGame; color: PlayerColor; justStarted: boolean }> {
    const game =
      this.games.get(input.gameIdOrCode) ??
      this.findByRoomCode(input.gameIdOrCode);

    if (!game) {
      throw new Error("GAME_NOT_FOUND");
    }

    const existingColor = this.colorOf(game, input.playerId);
    if (existingColor) {
      this.attachSocket(game, input.playerId, input.socketId);
      return { game, color: existingColor, justStarted: false };
    }

    if (game.status === "finished") {
      throw new Error("GAME_NOT_IN_PROGRESS");
    }

    if (game.seats.blue && game.seats.red) {
      throw new Error("ROOM_FULL");
    }

    const color: PlayerColor = game.seats.blue ? "red" : "blue";
    game.seats[color] = {
      playerId: input.playerId,
      displayName: input.displayName ?? (color === "blue" ? "Blue" : "Red"),
      socketId: input.socketId,
      connected: true,
    };
    this.playerToGame.set(input.playerId, game.id);

    let justStarted = false;
    if (game.seats.blue && game.seats.red && !game.engine) {
      this.startEngine(game);
      justStarted = true;
      void persistPlayerJoined({
        gameId: game.id,
        playerId: input.playerId,
        color,
        displayName: input.displayName,
      });
      void persistGameStarted(game.id);
    } else {
      void persistPlayerJoined({
        gameId: game.id,
        playerId: input.playerId,
        color,
        displayName: input.displayName,
      });
    }

    return { game, color, justStarted };
  }

  async createMatchmakingGame(input: {
    blue: { playerId: string; displayName?: string; socketId: string };
    red: { playerId: string; displayName?: string; socketId: string };
  }): Promise<ActiveGame> {
    const id = newGameId();
    const game: ActiveGame = {
      id,
      roomCode: null,
      mode: "matchmaking",
      status: "waiting",
      seats: {
        blue: {
          playerId: input.blue.playerId,
          displayName: input.blue.displayName ?? "Blue",
          socketId: input.blue.socketId,
          connected: true,
        },
        red: {
          playerId: input.red.playerId,
          displayName: input.red.displayName ?? "Red",
          socketId: input.red.socketId,
          connected: true,
        },
      },
      engine: null,
      winner: null,
      finishedReason: null,
      moveResults: new Map(),
    };

    this.startEngine(game);
    this.games.set(id, game);
    this.playerToGame.set(input.blue.playerId, id);
    this.playerToGame.set(input.red.playerId, id);

    void persistGameCreated({
      gameId: id,
      roomCode: null,
      status: "in_progress",
      ruleset: "classic",
      rulesetVersion: "2017.1",
      players: [
        {
          playerId: input.blue.playerId,
          color: "blue",
          displayName: input.blue.displayName,
        },
        {
          playerId: input.red.playerId,
          color: "red",
          displayName: input.red.displayName,
        },
      ],
    });

    return game;
  }

  private startEngine(game: ActiveGame): void {
    const blue = game.seats.blue;
    const red = game.seats.red;
    if (!blue || !red) {
      throw new Error("Cannot start without both seats");
    }

    game.engine = initializeGame({
      width: DEFAULT_BOARD_WIDTH,
      height: DEFAULT_BOARD_HEIGHT,
      ruleset: "classic",
      players: {
        blue: blue.playerId,
        red: red.playerId,
      },
    });
    game.status = "in_progress";
  }

  attachSocket(game: ActiveGame, playerId: string, socketId: string): PlayerColor | null {
    const color = this.colorOf(game, playerId);
    if (!color) return null;
    const seat = game.seats[color];
    if (!seat) return null;
    seat.socketId = socketId;
    seat.connected = true;
    return color;
  }

  markDisconnected(socketId: string): {
    game: ActiveGame;
    color: PlayerColor;
    playerId: string;
  } | null {
    for (const game of this.games.values()) {
      for (const color of ["blue", "red"] as const) {
        const seat = game.seats[color];
        if (seat?.socketId === socketId) {
          seat.connected = false;
          seat.socketId = null;
          return { game, color, playerId: seat.playerId };
        }
      }
    }
    return null;
  }

  applyPlayerMove(input: {
    gameId: string;
    playerId: string;
    x: number;
    y: number;
    expectedVersion: number;
    requestId: string;
  }):
    | { kind: "accepted"; game: ActiveGame; payload: GameMoveAcceptedPayload }
    | { kind: "rejected"; game: ActiveGame | null; payload: GameMoveRejectedPayload } {
    const game = this.games.get(input.gameId);
    if (!game || !game.engine) {
      return {
        kind: "rejected",
        game: game ?? null,
        payload: {
          requestId: input.requestId,
          code: "GAME_NOT_FOUND",
          message: "Game not found or not started.",
        },
      };
    }

    const cached = game.moveResults.get(input.requestId);
    if (cached) {
      return cached.kind === "accepted"
        ? { kind: "accepted", game, payload: cached.payload }
        : { kind: "rejected", game, payload: cached.payload };
    }

    if (game.status !== "in_progress" || game.engine.status !== "in_progress") {
      const payload: GameMoveRejectedPayload = {
        requestId: input.requestId,
        code: "GAME_NOT_IN_PROGRESS",
        message: "Game is not in progress.",
        state: this.wire(game) ?? undefined,
      };
      game.moveResults.set(input.requestId, { kind: "rejected", payload });
      return { kind: "rejected", game, payload };
    }

    if (this.colorOf(game, input.playerId) === null) {
      const payload: GameMoveRejectedPayload = {
        requestId: input.requestId,
        code: "NOT_IN_GAME",
        message: "You are not a player in this game.",
        state: this.wire(game) ?? undefined,
      };
      game.moveResults.set(input.requestId, { kind: "rejected", payload });
      return { kind: "rejected", game, payload };
    }

    if (input.expectedVersion !== game.engine.moveNumber) {
      const payload: GameMoveRejectedPayload = {
        requestId: input.requestId,
        code: "VERSION_MISMATCH",
        message: `expectedVersion ${input.expectedVersion} != server ${game.engine.moveNumber}`,
        state: this.wire(game) ?? undefined,
      };
      // Do not cache version mismatches — client may retry with correct version.
      return { kind: "rejected", game, payload };
    }

    const result = applyMove(game.engine, {
      playerId: input.playerId,
      x: input.x,
      y: input.y,
    });

    if (!result.ok) {
      const payload: GameMoveRejectedPayload = {
        requestId: input.requestId,
        code: result.error.code,
        message: result.error.message,
        state: this.wire(game) ?? undefined,
      };
      game.moveResults.set(input.requestId, { kind: "rejected", payload });
      return { kind: "rejected", game, payload };
    }

    const color = this.colorOf(game, input.playerId)!;
    game.engine = result.game;

    if (result.game.status === "finished") {
      game.status = "finished";
      game.finishedReason = result.game.finishedReason ?? "board_full";
      game.winner = result.game.winner;
      void persistGameFinished({
        gameId: game.id,
        winner: game.winner,
        reason: game.finishedReason ?? "board_full",
        version: result.game.moveNumber,
      });
    }

    const payload: GameMoveAcceptedPayload = {
      requestId: input.requestId,
      move: {
        playerId: input.playerId,
        color,
        x: input.x,
        y: input.y,
        moveNumber: result.game.moveNumber,
      },
      state: toWireState(game.id, result.game, game.winner),
    };

    game.moveResults.set(input.requestId, { kind: "accepted", payload });

    void persistMove({
      gameId: game.id,
      moveNumber: result.game.moveNumber,
      playerId: input.playerId,
      x: input.x,
      y: input.y,
      requestId: input.requestId,
      version: result.game.moveNumber,
    });

    return { kind: "accepted", game, payload };
  }

  resign(gameId: string, playerId: string): ActiveGame | null {
    const game = this.games.get(gameId);
    if (!game || !game.engine || game.status !== "in_progress") return null;
    const color = this.colorOf(game, playerId);
    if (!color) return null;

    const winner: PlayerColor = color === "blue" ? "red" : "blue";
    game.status = "finished";
    game.finishedReason = "resign";
    game.winner = winner;
    game.engine = {
      ...game.engine,
      status: "finished",
      winner,
      finishedReason: null, // resign is server-side, not an engine score finish
    };

    void persistGameFinished({
      gameId: game.id,
      winner,
      reason: "resign",
      version: game.engine.moveNumber,
    });

    return game;
  }

  /** Declare заземление (§8.1г / §8.2–8.4) via the pure engine. */
  declarePlayerLanding(gameId: string, playerId: string): ActiveGame | null {
    const game = this.games.get(gameId);
    if (!game || !game.engine || game.status !== "in_progress") return null;
    if (this.colorOf(game, playerId) === null) return null;

    const result = declareLanding(game.engine, { playerId });
    if (!result.ok) return null;

    game.engine = result.game;
    game.status = "finished";
    game.finishedReason = "landing";
    game.winner = result.game.winner;

    void persistGameFinished({
      gameId: game.id,
      winner: game.winner,
      reason: "landing",
      version: result.game.moveNumber,
    });

    return game;
  }

  /** Test helper / cleanup. */
  clear(): void {
    this.games.clear();
    this.byRoomCode.clear();
    this.playerToGame.clear();
  }
}

export const rooms = new GameRoomRegistry();
