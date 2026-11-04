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
   * Always false after initializeGame; capture milestone will set this.
   */
  disabled: boolean;
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

export type GameState = {
  ruleset: RulesetId;
  /** Semver-ish identifier for the ruleset revision used to build this state. */
  rulesetVersion: string;
  board: Board;
  /** Side to move. Classic start: blue. */
  currentPlayer: PlayerColor;
  scores: Record<PlayerColor, number>;
  /** Number of moves already applied. 0 at initial position. */
  moveNumber: number;
  status: GameStatus;
};

export type InitializeGameOptions = {
  width: number;
  height: number;
  ruleset: RulesetId;
};

export type MoveInput = {
  /** Opaque player id from the caller (server). Not validated in M2. */
  playerId: string;
  /** Formal 1-based X. */
  x: number;
  /** Formal 1-based Y. */
  y: number;
};
