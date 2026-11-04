import type { WireBoard } from "@dots/shared";

export type BoardLayout = {
  /** CSS pixel size of the canvas backing store (pre-DPR). */
  cssWidth: number;
  cssHeight: number;
  /** Padding around the grid in CSS pixels. */
  pad: number;
  cell: number;
  originX: number;
  originY: number;
};

/**
 * Fit a classic board into a container while preserving aspect ratio.
 * Formal coords: x left→right, y bottom→top (flip for canvas).
 */
export function computeLayout(
  board: Pick<WireBoard, "width" | "height">,
  containerWidth: number,
  containerHeight: number,
): BoardLayout {
  const pad = 12;
  const availW = Math.max(120, containerWidth - pad * 2);
  const availH = Math.max(120, containerHeight - pad * 2);
  const cell = Math.min(availW / (board.width - 1), availH / (board.height - 1));
  const gridW = cell * (board.width - 1);
  const gridH = cell * (board.height - 1);
  const cssWidth = gridW + pad * 2;
  const cssHeight = gridH + pad * 2;
  return {
    cssWidth,
    cssHeight,
    pad,
    cell,
    originX: pad,
    originY: pad,
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

/** Nearest formal intersection for a canvas point, or null if far from grid. */
export function canvasToFormal(
  layout: BoardLayout,
  board: Pick<WireBoard, "width" | "height">,
  canvasX: number,
  canvasY: number,
): { x: number; y: number } | null {
  const fx = (canvasX - layout.originX) / layout.cell + 1;
  const fy = board.height - (canvasY - layout.originY) / layout.cell;
  const x = Math.round(fx);
  const y = Math.round(fy);
  if (x < 1 || y < 1 || x > board.width || y > board.height) return null;
  const { cx, cy } = formalToCanvas(layout, board, x, y);
  const dist = Math.hypot(canvasX - cx, canvasY - cy);
  if (dist > layout.cell * 0.45) return null;
  return { x, y };
}
