import type { PlayerColor, RulesetId } from "../../types";
import {
  CLASSIC_BOARD_HEIGHT,
  CLASSIC_BOARD_WIDTH,
  CLASSIC_FIRST_PLAYER,
  CLASSIC_INITIAL_CROSS,
  CLASSIC_RULESET_ID,
  CLASSIC_RULESET_VERSION,
} from "./constants";
import { createClassicInitialBoard } from "./initial-position";

export {
  CLASSIC_BOARD_HEIGHT,
  CLASSIC_BOARD_WIDTH,
  CLASSIC_FIRST_PLAYER,
  CLASSIC_INITIAL_CROSS,
  CLASSIC_RULESET_ID,
  CLASSIC_RULESET_VERSION,
} from "./constants";

export { createClassicInitialBoard } from "./initial-position";

export type ClassicRuleset = {
  id: typeof CLASSIC_RULESET_ID;
  version: typeof CLASSIC_RULESET_VERSION;
  boardWidth: typeof CLASSIC_BOARD_WIDTH;
  boardHeight: typeof CLASSIC_BOARD_HEIGHT;
  firstPlayer: typeof CLASSIC_FIRST_PLAYER;
  initialCross: typeof CLASSIC_INITIAL_CROSS;
  createInitialBoard: () => ReturnType<typeof createClassicInitialBoard>;
};

export const classicRuleset: ClassicRuleset = {
  id: CLASSIC_RULESET_ID,
  version: CLASSIC_RULESET_VERSION,
  boardWidth: CLASSIC_BOARD_WIDTH,
  boardHeight: CLASSIC_BOARD_HEIGHT,
  firstPlayer: CLASSIC_FIRST_PLAYER,
  initialCross: CLASSIC_INITIAL_CROSS,
  createInitialBoard: createClassicInitialBoard,
};

export function assertClassicBoardSize(
  ruleset: RulesetId,
  width: number,
  height: number,
): void {
  if (ruleset !== CLASSIC_RULESET_ID) {
    throw new Error(`Unknown ruleset: ${String(ruleset)}`);
  }
  if (width !== CLASSIC_BOARD_WIDTH || height !== CLASSIC_BOARD_HEIGHT) {
    throw new Error(
      `Classic ruleset requires ${CLASSIC_BOARD_WIDTH}×${CLASSIC_BOARD_HEIGHT}, got ${width}×${height}`,
    );
  }
}

export function classicOpponent(color: PlayerColor): PlayerColor {
  return color === "blue" ? "red" : "blue";
}
