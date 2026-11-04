/**
 * Shared game-engine types.
 *
 * Coordinates follow formal СКСТ Sports Dots notation (see rules/classic):
 * 1-based, x left→right, y bottom→top.
 */

export type PlayerColor = "blue" | "red";

export type RulesetId = "classic";

/** One intersection on the board. */
export type Cell = {
  /** Occupying color, or null if empty. */
  color: PlayerColor | null;
  /**
   * Excluded from further play (formal §5.7).
   * Interior of an enclosure is disabled; the enclosing chain stays active (§5.8).
   */
  disabled: boolean;
  /**
   * Owner of the enclosure that disabled this cell (§5.7 / §6.1).
   * Null when the cell is not disabled via capture.
   */
  capturedBy: PlayerColor | null;
};

export type Board = {
  /** Intersections along X (formal horizontal). Classic: 39. */
  width: number;
  /** Intersections along Y (formal vertical). Classic: 32. */
  height: number;
  /**
   * Row-major cells with formal y ascending:
   * index = (y - 1) * width + (x - 1), x/y in 1..width / 1..height.
   */
  cells: Cell[];
};

export type GameStatus = "in_progress" | "finished";

/**
 * Why the engine marked the game finished.
 * Resign / time / agreed draw stay outside the pure engine (server/UI).
 */
export type FinishedReason = "board_full" | "landing";

export type GamePlayers = Record<PlayerColor, string>;

export type GameState = {
  ruleset: RulesetId;
  /** Semver-ish identifier for the ruleset revision used to build this state. */
  rulesetVersion: string;
  board: Board;
  /** Side to move. Classic start: blue. */
  currentPlayer: PlayerColor;
  /** Opaque player ids bound to colors (server-provided). */
  players: GamePlayers;
  scores: Record<PlayerColor, number>;
  /** Number of moves already applied. 0 at initial position. */
  moveNumber: number;
  status: GameStatus;
  /**
   * §8.6 score winner when the engine ends the game (`board_full` / `landing`).
   * Null while in progress, or on a score draw.
   */
  winner: PlayerColor | null;
  /** Null while `status === "in_progress"`. */
  finishedReason: FinishedReason | null;
};

export type InitializeGameOptions = {
  width: number;
  height: number;
  ruleset: RulesetId;
  /** Optional opaque ids; defaults to player-1 (blue) / player-2 (red). */
  players?: Partial<GamePlayers>;
};

export type MoveInput = {
  /** Opaque player id from the caller (server). Must match `players[currentPlayer]`. */
  playerId: string;
  /** Formal 1-based X. */
  x: number;
  /** Formal 1-based Y. */
  y: number;
};

export type MoveErrorCode =
  | "GAME_NOT_IN_PROGRESS"
  | "UNKNOWN_PLAYER"
  | "NOT_YOUR_TURN"
  | "OUT_OF_BOUNDS"
  | "OCCUPIED"
  | "DISABLED";

export type MoveError = {
  code: MoveErrorCode;
  message: string;
};

export type ApplyMoveSuccess = {
  ok: true;
  game: GameState;
};

export type ApplyMoveFailure = {
  ok: false;
  error: MoveError;
};

export type ApplyMoveResult = ApplyMoveSuccess | ApplyMoveFailure;

/** Declare заземление / landing (§8.1г, §8.2–8.4). */
export type LandingInput = {
  playerId: string;
};

export type LandingErrorCode = "GAME_NOT_IN_PROGRESS" | "UNKNOWN_PLAYER";

export type LandingError = {
  code: LandingErrorCode;
  message: string;
};

export type DeclareLandingSuccess = {
  ok: true;
  game: GameState;
};

export type DeclareLandingFailure = {
  ok: false;
  error: LandingError;
};

export type DeclareLandingResult = DeclareLandingSuccess | DeclareLandingFailure;

/** A connected set of cell indices (flat board indices). */
export type ConnectedComponent = {
  indices: number[];
};

/** Closed enclosing chain (active points of one color adjacent to an interior). */
export type ClosedContour = {
  color: PlayerColor;
  /** Flat indices of active chain points. */
  indices: number[];
};

export type EnclosedRegionKind = "capture" | "house";

/**
 * Interior region sealed by `color` walls from the board edge (§5.4–5.5, §5.12).
 * `kind` distinguishes capture (has active opponent) from домик (house).
 */
export type EnclosedRegion = {
  color: PlayerColor;
  kind: EnclosedRegionKind;
  /** Flat indices of interior cells (not including the enclosing chain). */
  interior: number[];
  /** Contour that seals this interior. */
  contour: ClosedContour;
};
