/**
 * @dots/game-engine
 *
 * Pure Спортивные точки logic — no Socket.IO / Next.js / Prisma deps.
 * Milestone 2: board structure + classic initializeGame. applyMove is a stub.
 */

export const ENGINE_VERSION = "0.1.0-m2" as const;

export type EngineCapabilities = {
  version: typeof ENGINE_VERSION;
  initializeGame: true;
  applyMove: false;
  message: string;
};

export function getEngineStatus(): EngineCapabilities {
  return {
    version: ENGINE_VERSION,
    initializeGame: true,
    applyMove: false,
    message:
      "initializeGame (classic) ready; applyMove validation/capture not implemented yet.",
  };
}

export { initializeGame } from "./initialize-game.js";
export { applyMove } from "./apply-move.js";

export type {
  Board,
  Cell,
  GameState,
  GameStatus,
  InitializeGameOptions,
  MoveInput,
  PlayerColor,
  RulesetId,
} from "./types.js";

export {
  createEmptyBoard,
  placeDots,
  getCell,
  toIndex,
  fromIndex,
  isInBounds,
  formatPoint,
} from "./board/index.js";
export type { Point, ColoredPoint } from "./board/index.js";

export {
  classicRuleset,
  createClassicInitialBoard,
  classicOpponent,
  CLASSIC_BOARD_WIDTH,
  CLASSIC_BOARD_HEIGHT,
  CLASSIC_FIRST_PLAYER,
  CLASSIC_INITIAL_CROSS,
  CLASSIC_RULESET_ID,
  CLASSIC_RULESET_VERSION,
} from "./rules/classic/index.js";
