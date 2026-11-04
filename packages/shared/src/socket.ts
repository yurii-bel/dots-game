import { z } from "zod";

/** Opaque player id (server-issued UUID for live games). */
export const PlayerIdSchema = z.string().uuid();
export type PlayerId = z.infer<typeof PlayerIdSchema>;

export const PlayerColorSchema = z.enum(["blue", "red"]);
export type PlayerColor = z.infer<typeof PlayerColorSchema>;

export const GameStatusSchema = z.enum(["in_progress", "finished"]);
export type GameStatus = z.infer<typeof GameStatusSchema>;

export const MoveErrorCodeSchema = z.enum([
  "GAME_NOT_IN_PROGRESS",
  "UNKNOWN_PLAYER",
  "NOT_YOUR_TURN",
  "OUT_OF_BOUNDS",
  "OCCUPIED",
  "DISABLED",
  "VERSION_MISMATCH",
  "INVALID_PAYLOAD",
  "NOT_IN_GAME",
  "GAME_NOT_FOUND",
  "ROOM_FULL",
  "ALREADY_IN_QUEUE",
]);
export type MoveErrorCode = z.infer<typeof MoveErrorCodeSchema>;

/** One board intersection on the wire. */
export const WireCellSchema = z.object({
  color: PlayerColorSchema.nullable(),
  disabled: z.boolean(),
  capturedBy: PlayerColorSchema.nullable(),
});
export type WireCell = z.infer<typeof WireCellSchema>;

export const WireBoardSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  cells: z.array(WireCellSchema),
});
export type WireBoard = z.infer<typeof WireBoardSchema>;

/** Authoritative game snapshot sent to clients (no rules logic). */
export const WireGameStateSchema = z.object({
  gameId: z.string().min(1),
  ruleset: z.literal("classic"),
  rulesetVersion: z.string().min(1),
  board: WireBoardSchema,
  currentPlayer: PlayerColorSchema,
  players: z.object({
    blue: PlayerIdSchema,
    red: PlayerIdSchema,
  }),
  scores: z.object({
    blue: z.number().int().nonnegative(),
    red: z.number().int().nonnegative(),
  }),
  /** Same as engine moveNumber; used as optimistic concurrency version. */
  version: z.number().int().nonnegative(),
  status: GameStatusSchema,
  winner: PlayerColorSchema.nullable().optional(),
});
export type WireGameState = z.infer<typeof WireGameStateSchema>;

export const SocketEvents = {
  // Client → server
  matchmakingJoin: "matchmaking:join",
  matchmakingCancel: "matchmaking:cancel",
  gameCreate: "game:create",
  gameJoin: "game:join",
  gameMove: "game:move",
  gameResign: "game:resign",
  gameSync: "game:sync",
  // Server → client
  matchmakingFound: "matchmaking:found",
  gameStarted: "game:started",
  gameMoveAccepted: "game:move:accepted",
  gameMoveRejected: "game:move:rejected",
  gameState: "game:state",
  gameOpponentDisconnected: "game:opponent:disconnected",
  gameOpponentReconnected: "game:opponent:reconnected",
  gameFinished: "game:finished",
  serverError: "server:error",
} as const;

export type SocketEventName = (typeof SocketEvents)[keyof typeof SocketEvents];

// --- Client → server payloads ---

export const MatchmakingJoinPayloadSchema = z.object({
  playerId: PlayerIdSchema,
  displayName: z.string().trim().min(1).max(32).optional(),
});
export type MatchmakingJoinPayload = z.infer<typeof MatchmakingJoinPayloadSchema>;

export const MatchmakingCancelPayloadSchema = z.object({
  playerId: PlayerIdSchema,
});
export type MatchmakingCancelPayload = z.infer<typeof MatchmakingCancelPayloadSchema>;

export const GameCreatePayloadSchema = z.object({
  playerId: PlayerIdSchema,
  displayName: z.string().trim().min(1).max(32).optional(),
});
export type GameCreatePayload = z.infer<typeof GameCreatePayloadSchema>;

export const GameJoinPayloadSchema = z.object({
  gameId: z.string().min(1),
  playerId: PlayerIdSchema,
  displayName: z.string().trim().min(1).max(32).optional(),
});
export type GameJoinPayload = z.infer<typeof GameJoinPayloadSchema>;

export const GameMovePayloadSchema = z.object({
  gameId: z.string().min(1),
  playerId: PlayerIdSchema,
  x: z.number().int(),
  y: z.number().int(),
  /** Client's last known version; must match server or move is rejected. */
  expectedVersion: z.number().int().nonnegative(),
  /** Idempotency key — duplicate requestId returns the prior result. */
  requestId: z.string().uuid(),
});
export type GameMovePayload = z.infer<typeof GameMovePayloadSchema>;

export const GameResignPayloadSchema = z.object({
  gameId: z.string().min(1),
  playerId: PlayerIdSchema,
});
export type GameResignPayload = z.infer<typeof GameResignPayloadSchema>;

export const GameSyncPayloadSchema = z.object({
  gameId: z.string().min(1),
  playerId: PlayerIdSchema,
});
export type GameSyncPayload = z.infer<typeof GameSyncPayloadSchema>;

// --- Server → client payloads ---

export const MatchmakingFoundPayloadSchema = z.object({
  gameId: z.string().min(1),
  color: PlayerColorSchema,
  state: WireGameStateSchema,
});
export type MatchmakingFoundPayload = z.infer<typeof MatchmakingFoundPayloadSchema>;

export const GameStartedPayloadSchema = z.object({
  gameId: z.string().min(1),
  color: PlayerColorSchema,
  state: WireGameStateSchema,
  /** Present for private rooms so the host can share a join code. */
  roomCode: z.string().min(1).optional(),
});
export type GameStartedPayload = z.infer<typeof GameStartedPayloadSchema>;

export const GameMoveAcceptedPayloadSchema = z.object({
  requestId: z.string().uuid(),
  move: z.object({
    playerId: PlayerIdSchema,
    color: PlayerColorSchema,
    x: z.number().int(),
    y: z.number().int(),
    moveNumber: z.number().int().positive(),
  }),
  state: WireGameStateSchema,
});
export type GameMoveAcceptedPayload = z.infer<typeof GameMoveAcceptedPayloadSchema>;

export const GameMoveRejectedPayloadSchema = z.object({
  requestId: z.string().uuid(),
  code: MoveErrorCodeSchema,
  message: z.string(),
  /** Current authoritative state when available (e.g. version mismatch). */
  state: WireGameStateSchema.optional(),
});
export type GameMoveRejectedPayload = z.infer<typeof GameMoveRejectedPayloadSchema>;

export const GameStatePayloadSchema = z.object({
  state: WireGameStateSchema,
  yourColor: PlayerColorSchema.nullable(),
});
export type GameStatePayload = z.infer<typeof GameStatePayloadSchema>;

export const GameOpponentPresencePayloadSchema = z.object({
  gameId: z.string().min(1),
  playerId: PlayerIdSchema,
  color: PlayerColorSchema,
});
export type GameOpponentPresencePayload = z.infer<
  typeof GameOpponentPresencePayloadSchema
>;

export const GameFinishedPayloadSchema = z.object({
  gameId: z.string().min(1),
  reason: z.enum(["board_full", "resign", "disconnect_forfeit"]),
  winner: PlayerColorSchema.nullable(),
  state: WireGameStateSchema,
});
export type GameFinishedPayload = z.infer<typeof GameFinishedPayloadSchema>;

export const ServerErrorPayloadSchema = z.object({
  code: MoveErrorCodeSchema.or(z.literal("INTERNAL")),
  message: z.string(),
});
export type ServerErrorPayload = z.infer<typeof ServerErrorPayloadSchema>;

/** Private room create ack (waiting for opponent). */
export const GameCreateAckSchema = z.object({
  gameId: z.string().min(1),
  roomCode: z.string().min(1),
  color: PlayerColorSchema,
});
export type GameCreateAck = z.infer<typeof GameCreateAckSchema>;
