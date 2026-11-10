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
  /** Engine / seat key (server-issued UUID). */
  playerId: string;
  /** Prisma User id. */
  userId: string;
  nickname: string;
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
  /** Server wall-clock ms when startEngine ran; null while waiting. */
  startedAt: number | null;
  /** Server wall-clock ms when status became finished; null until then. */
  finishedAt: number | null;
  /** requestId → prior move result (idempotency). */
  moveResults: Map<string, MoveResultCache>;
};

/** Optional timing fields for socket payloads (shape A). */
export function timingFields(game: ActiveGame): {
  startedAt?: number;
  finishedAt?: number;
} {
  return {
    ...(game.startedAt != null ? { startedAt: game.startedAt } : {}),
    ...(game.finishedAt != null ? { finishedAt: game.finishedAt } : {}),
  };
}

function roomCode(): string {
  return randomBytes(3).toString("hex").toUpperCase();
}

function newGameId(): string {
  return randomUUID();
}

function newPlayerId(): string {
  return randomUUID();
}

function seatNicknames(game: ActiveGame): {
  blue: string | null;
  red: string | null;
} {
  return {
    blue: game.seats.blue?.nickname ?? null,
    red: game.seats.red?.nickname ?? null,
  };
}

export class GameRoomRegistry {
  private readonly games = new Map<string, ActiveGame>();
  private readonly byRoomCode = new Map<string, string>();
  /** Seat playerId → gameId */
  private readonly playerToGame = new Map<string, string>();
  /** Prisma userId → gameId (active in-memory room). */
  private readonly userToGame = new Map<string, string>();

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

  findByUser(userId: string): ActiveGame | undefined {
    const id = this.userToGame.get(userId);
    return id ? this.games.get(id) : undefined;
  }

  colorOf(game: ActiveGame, playerId: string): PlayerColor | null {
    if (game.seats.blue?.playerId === playerId) return "blue";
    if (game.seats.red?.playerId === playerId) return "red";
    return null;
  }

  colorOfUser(game: ActiveGame, userId: string): PlayerColor | null {
    if (game.seats.blue?.userId === userId) return "blue";
    if (game.seats.red?.userId === userId) return "red";
    return null;
  }

  seatOfUser(game: ActiveGame, userId: string): Seat | null {
    const color = this.colorOfUser(game, userId);
    if (!color) return null;
    return game.seats[color] ?? null;
  }

  wire(game: ActiveGame): WireGameState | null {
    if (!game.engine) return null;
    return toWireState(game.id, game.engine, game.winner, seatNicknames(game));
  }

  async createPrivateRoom(input: {
    userId: string;
    nickname: string;
    socketId: string;
  }): Promise<{ game: ActiveGame; color: PlayerColor; roomCode: string; playerId: string }> {
    const existing = this.findByUser(input.userId);
    if (existing && existing.status !== "finished") {
      throw new Error("ALREADY_IN_GAME");
    }

    const id = newGameId();
    const code = roomCode();
    const playerId = newPlayerId();
    const game: ActiveGame = {
      id,
      roomCode: code,
      mode: "private",
      status: "waiting",
      seats: {
        blue: {
          playerId,
          userId: input.userId,
          nickname: input.nickname,
          socketId: input.socketId,
          connected: true,
        },
      },
      engine: null,
      winner: null,
      finishedReason: null,
      startedAt: null,
      finishedAt: null,
      moveResults: new Map(),
    };

    this.games.set(id, game);
    this.byRoomCode.set(code, id);
    this.playerToGame.set(playerId, id);
    this.userToGame.set(input.userId, id);

    void persistGameCreated({
      gameId: id,
      roomCode: code,
      status: "waiting",
      ruleset: "classic",
      rulesetVersion: "2017.1",
      players: [
        {
          playerId,
          userId: input.userId,
          color: "blue",
          displayName: input.nickname,
        },
      ],
    });

    return { game, color: "blue", roomCode: code, playerId };
  }

  async joinPrivateRoom(input: {
    gameIdOrCode: string;
    userId: string;
    nickname: string;
    socketId: string;
  }): Promise<{
    game: ActiveGame;
    color: PlayerColor;
    justStarted: boolean;
    playerId: string;
  }> {
    const game =
      this.games.get(input.gameIdOrCode) ??
      this.findByRoomCode(input.gameIdOrCode);

    if (!game) {
      throw new Error("GAME_NOT_FOUND");
    }

    const existingColor = this.colorOfUser(game, input.userId);
    if (existingColor) {
      this.attachSocketByUser(game, input.userId, input.socketId);
      const seat = game.seats[existingColor]!;
      // Refresh nickname from authoritative account if it changed.
      seat.nickname = input.nickname;
      return {
        game,
        color: existingColor,
        justStarted: false,
        playerId: seat.playerId,
      };
    }

    if (game.status === "finished") {
      throw new Error("GAME_NOT_IN_PROGRESS");
    }

    if (game.seats.blue && game.seats.red) {
      throw new Error("ROOM_FULL");
    }

    const other = this.findByUser(input.userId);
    if (other && other.id !== game.id && other.status !== "finished") {
      throw new Error("ALREADY_IN_GAME");
    }

    const color: PlayerColor = game.seats.blue ? "red" : "blue";
    const playerId = newPlayerId();
    game.seats[color] = {
      playerId,
      userId: input.userId,
      nickname: input.nickname,
      socketId: input.socketId,
      connected: true,
    };
    this.playerToGame.set(playerId, game.id);
    this.userToGame.set(input.userId, game.id);

    let justStarted = false;
    if (game.seats.blue && game.seats.red && !game.engine) {
      this.startEngine(game);
      justStarted = true;
      void persistPlayerJoined({
        gameId: game.id,
        playerId,
        userId: input.userId,
        color,
        displayName: input.nickname,
      });
      void persistGameStarted(game.id);
    } else {
      void persistPlayerJoined({
        gameId: game.id,
        playerId,
        userId: input.userId,
        color,
        displayName: input.nickname,
      });
    }

    return { game, color, justStarted, playerId };
  }

  async createMatchmakingGame(input: {
    blue: { userId: string; nickname: string; socketId: string };
    red: { userId: string; nickname: string; socketId: string };
  }): Promise<ActiveGame> {
    const id = newGameId();
    const bluePlayerId = newPlayerId();
    const redPlayerId = newPlayerId();
    const game: ActiveGame = {
      id,
      roomCode: null,
      mode: "matchmaking",
      status: "waiting",
      seats: {
        blue: {
          playerId: bluePlayerId,
          userId: input.blue.userId,
          nickname: input.blue.nickname,
          socketId: input.blue.socketId,
          connected: true,
        },
        red: {
          playerId: redPlayerId,
          userId: input.red.userId,
          nickname: input.red.nickname,
          socketId: input.red.socketId,
          connected: true,
        },
      },
      engine: null,
      winner: null,
      finishedReason: null,
      startedAt: null,
      finishedAt: null,
      moveResults: new Map(),
    };

    this.startEngine(game);
    this.games.set(id, game);
    this.playerToGame.set(bluePlayerId, id);
    this.playerToGame.set(redPlayerId, id);
    this.userToGame.set(input.blue.userId, id);
    this.userToGame.set(input.red.userId, id);

    void persistGameCreated({
      gameId: id,
      roomCode: null,
      status: "in_progress",
      ruleset: "classic",
      rulesetVersion: "2017.1",
      players: [
        {
          playerId: bluePlayerId,
          userId: input.blue.userId,
          color: "blue",
          displayName: input.blue.nickname,
        },
        {
          playerId: redPlayerId,
          userId: input.red.userId,
          color: "red",
          displayName: input.red.nickname,
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
    if (game.startedAt == null) {
      game.startedAt = Date.now();
    }
  }

  private markFinished(game: ActiveGame): void {
    if (game.finishedAt == null) {
      game.finishedAt = Date.now();
    }
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

  attachSocketByUser(
    game: ActiveGame,
    userId: string,
    socketId: string,
  ): PlayerColor | null {
    const color = this.colorOfUser(game, userId);
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

  /**
   * Explicit leave (private + matchmaking):
   * - waiting → free seat; destroy room if empty (invalidate room code)
   * - in_progress → resign
   * Soft disconnect does not call this; same userId may reattach via join/sync.
   */
  leave(gameId: string, userId: string):
    | { kind: "destroyed"; gameId: string; roomCode: string | null }
    | {
        kind: "seat_freed";
        game: ActiveGame;
        color: PlayerColor;
        playerId: string;
      }
    | { kind: "resigned"; game: ActiveGame }
    | { kind: "noop_finished"; game: ActiveGame }
    | null {
    const game = this.games.get(gameId) ?? this.findByRoomCode(gameId);
    if (!game) return null;

    const color = this.colorOfUser(game, userId);
    if (!color) return null;
    const seat = game.seats[color];
    if (!seat) return null;

    if (game.status === "finished") {
      this.playerToGame.delete(seat.playerId);
      this.userToGame.delete(userId);
      return { kind: "noop_finished", game };
    }

    if (game.status === "in_progress") {
      const resigned = this.resign(game.id, seat.playerId);
      return resigned ? { kind: "resigned", game: resigned } : null;
    }

    // waiting — free this seat only
    delete game.seats[color];
    this.playerToGame.delete(seat.playerId);
    this.userToGame.delete(userId);

    const remaining = (["blue", "red"] as const).filter((c) => game.seats[c]);
    if (remaining.length === 0) {
      const code = game.roomCode;
      this.destroyGame(game.id);
      return { kind: "destroyed", gameId: game.id, roomCode: code };
    }

    return { kind: "seat_freed", game, color, playerId: seat.playerId };
  }

  /** Drop a game from all in-memory indexes (invalidates room code). */
  destroyGame(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;

    if (game.roomCode) {
      this.byRoomCode.delete(game.roomCode);
    }
    for (const color of ["blue", "red"] as const) {
      const seat = game.seats[color];
      if (seat) {
        this.playerToGame.delete(seat.playerId);
        this.userToGame.delete(seat.userId);
      }
    }
    this.games.delete(gameId);
    return true;
  }

  /** Placeholder wire state for a waiting private room (no engine yet). */
  waitingPlaceholder(game: ActiveGame): WireGameState {
    return {
      gameId: game.id,
      ruleset: "classic",
      rulesetVersion: "2017.1",
      board: { width: DEFAULT_BOARD_WIDTH, height: DEFAULT_BOARD_HEIGHT, cells: [] },
      currentPlayer: "blue",
      players: {
        blue: game.seats.blue?.playerId ?? "00000000-0000-4000-8000-000000000000",
        red: game.seats.red?.playerId ?? "00000000-0000-4000-8000-000000000001",
      },
      nicknames: seatNicknames(game),
      scores: { blue: 0, red: 0 },
      version: 0,
      status: "in_progress",
      winner: null,
    };
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
      this.markFinished(game);
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
      state: toWireState(game.id, result.game, game.winner, seatNicknames(game)),
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
    this.markFinished(game);
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
    this.markFinished(game);

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
    this.userToGame.clear();
  }
}

export const rooms = new GameRoomRegistry();
