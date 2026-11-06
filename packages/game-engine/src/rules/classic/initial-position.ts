import { createEmptyBoard, placeDots } from "../../board/create-board";
import type { Board } from "../../types";
import {
  CLASSIC_BOARD_HEIGHT,
  CLASSIC_BOARD_WIDTH,
  CLASSIC_INITIAL_CROSS,
} from "./constants";

/** Build the classic starting board with the official initial cross. */
export function createClassicInitialBoard(): Board {
  const empty = createEmptyBoard(CLASSIC_BOARD_WIDTH, CLASSIC_BOARD_HEIGHT);
  return placeDots(empty, CLASSIC_INITIAL_CROSS);
}
