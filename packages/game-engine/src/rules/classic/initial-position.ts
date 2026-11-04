import { createEmptyBoard, placeDots } from "../../board/create-board.js";
import type { Board } from "../../types.js";
import {
  CLASSIC_BOARD_HEIGHT,
  CLASSIC_BOARD_WIDTH,
  CLASSIC_INITIAL_CROSS,
} from "./constants.js";

/** Build the classic starting board with the official initial cross. */
export function createClassicInitialBoard(): Board {
  const empty = createEmptyBoard(CLASSIC_BOARD_WIDTH, CLASSIC_BOARD_HEIGHT);
  return placeDots(empty, CLASSIC_INITIAL_CROSS);
}
