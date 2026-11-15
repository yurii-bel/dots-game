import type { WireBoard } from "@dots/shared";

export type BoardLayout = {
  /** CSS pixel size of the canvas backing store (pre-DPR). */
  cssWidth: number;
  cssHeight: number;
  /** Legacy uniform pad (min of axis paddings) — prefer padLeft/etc. */
  pad: number;
  /** Padding for Y-axis labels (left). */
  padLeft: number;
  padRight: number;
  padTop: number;
  /** Padding for X-axis labels (bottom). */
  padBottom: number;
  cell: number;
  originX: number;
  originY: number;
};

/** Space for Tensu-style axis numbers outside the grid. */
export const AXIS_PAD_LEFT = 22;
export const AXIS_PAD_BOTTOM = 18;
export const AXIS_PAD_TOP = 10;
export const AXIS_PAD_RIGHT = 10;

/**
 * Fit a classic board into a container while preserving aspect ratio.
 * Formal coords: x left→right, y bottom→top (flip for canvas).
 */
export function computeLayout(
  board: Pick<WireBoard, "width" | "height">,
  containerWidth: number,
  containerHeight: number,
): BoardLayout {
  const padLeft = AXIS_PAD_LEFT;
  const padRight = AXIS_PAD_RIGHT;
  const padTop = AXIS_PAD_TOP;
  const padBottom = AXIS_PAD_BOTTOM;
  const availW = Math.max(120, containerWidth - padLeft - padRight);
  const availH = Math.max(120, containerHeight - padTop - padBottom);
  const cell = Math.min(availW / (board.width - 1), availH / (board.height - 1));
  const gridW = cell * (board.width - 1);
  const gridH = cell * (board.height - 1);
  const cssWidth = gridW + padLeft + padRight;
  const cssHeight = gridH + padTop + padBottom;
  return {
    cssWidth,
    cssHeight,
    pad: Math.min(padLeft, padRight, padTop, padBottom),
    padLeft,
    padRight,
    padTop,
    padBottom,
    cell,
    originX: padLeft,
    originY: padTop,
  };
}

/** Canvas Y (top-down) for formal Y (bottom-up). */
export function formalToCanvas(
  layout: BoardLayout,
  board: Pick<WireBoard, "width" | "height">,
  x: number,
  y: number,
): { cx: number; cy: number } {
  const cx = layout.originX + (x - 1) * layout.cell;
  const cy = layout.originY + (board.height - y) * layout.cell;
  return { cx, cy };
}

/**
 * Nearest formal intersection for a canvas point.
 * Always snaps while the pointer is over the board (no mid-cell dead zone).
 * Returns null only when the point is outside the padded canvas bounds.
 */
export function canvasToFormal(
  layout: BoardLayout,
  board: Pick<WireBoard, "width" | "height">,
  canvasX: number,
  canvasY: number,
): { x: number; y: number } | null {
  if (
    canvasX < 0 ||
    canvasY < 0 ||
    canvasX > layout.cssWidth ||
    canvasY > layout.cssHeight
  ) {
    return null;
  }
  const fx = (canvasX - layout.originX) / layout.cell + 1;
  const fy = board.height - (canvasY - layout.originY) / layout.cell;
  const x = Math.min(board.width, Math.max(1, Math.round(fx)));
  const y = Math.min(board.height, Math.max(1, Math.round(fy)));
  return { x, y };
}
