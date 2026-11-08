import type { PlayerColor, WireBoard, WireCell } from "@dots/shared";
import { computeLayout, formalToCanvas, type BoardLayout } from "./board-geometry";
import { buildTerritoryPaths } from "./territory-paths";

const COLORS = {
  grid: "#c8cdd5",
  gridMajor: "#aeb6c2",
  paper: "#ffffff",
  blue: "#1d4ed8",
  red: "#dc2626",
  /** Task 5 — approved 30% fill opacity. */
  blueTerritory: "rgba(37, 99, 235, 0.30)",
  redTerritory: "rgba(220, 38, 38, 0.30)",
  pending: "rgba(15, 23, 42, 0.35)",
} as const;

/** Preview ghost opacity (Task 3). Distinct from pending (0.55). */
export const HOVER_PREVIEW_ALPHA = 0.85;

/** Mild shrink for disabled/captured stones (Task 5). */
export const CAPTURED_DOT_SCALE = 0.85;

export type LastMoveHighlight = {
  x: number;
  y: number;
  color: PlayerColor;
};

function cellAt(board: WireBoard, x: number, y: number): WireCell | null {
  if (board.cells.length === 0) return null;
  const idx = (y - 1) * board.width + (x - 1);
  return board.cells[idx] ?? null;
}

/** Empty, non-disabled intersection — client heuristic matching applyMove occupied/disabled rejects. */
export function isCellPlayable(board: WireBoard, x: number, y: number): boolean {
  const cell = cellAt(board, x, y);
  if (!cell) return false;
  return cell.color === null && !cell.disabled;
}

export function territoryStrokeWidth(cell: number): number {
  return Math.max(2.5, cell * 0.18);
}

export type DrawOptions = {
  board: WireBoard;
  layout: BoardLayout;
  hover: { x: number; y: number } | null;
  yourColor: PlayerColor | null;
  pending: { x: number; y: number; color: PlayerColor } | null;
  lastMove: LastMoveHighlight | null;
  dpr: number;
};

export function drawBoard(
  ctx: CanvasRenderingContext2D,
  { board, layout, hover, yourColor, pending, lastMove, dpr }: DrawOptions,
): void {
  const { cssWidth, cssHeight, cell } = layout;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  // Paper background
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, cssWidth, cssHeight);

  // Grid lines (territories draw above — Task 5)
  ctx.lineWidth = 1;
  for (let x = 1; x <= board.width; x += 1) {
    const { cx, cy: cyTop } = formalToCanvas(layout, board, x, board.height);
    const { cy: cyBot } = formalToCanvas(layout, board, x, 1);
    ctx.strokeStyle = x % 5 === 1 ? COLORS.gridMajor : COLORS.grid;
    ctx.beginPath();
    ctx.moveTo(cx, cyTop);
    ctx.lineTo(cx, cyBot);
    ctx.stroke();
  }
  for (let y = 1; y <= board.height; y += 1) {
    const { cx: cxLeft, cy } = formalToCanvas(layout, board, 1, y);
    const { cx: cxRight } = formalToCanvas(layout, board, board.width, y);
    ctx.strokeStyle = y % 5 === 1 ? COLORS.gridMajor : COLORS.grid;
    ctx.beginPath();
    ctx.moveTo(cxLeft, cy);
    ctx.lineTo(cxRight, cy);
    ctx.stroke();
  }

  // Captured territories — R1 hybrid rings (wall centers or half-cell); even-odd holes
  if (board.cells.length > 0) {
    const territories = buildTerritoryPaths(board);
    const strokeW = territoryStrokeWidth(cell);

    for (const region of territories) {
      if (region.rings.length === 0) continue;
      ctx.beginPath();
      for (const ring of region.rings) {
        if (ring.length < 3) continue;
        ring.forEach((p, i) => {
          const { cx, cy } = formalToCanvas(layout, board, p.x, p.y);
          if (i === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        });
        ctx.closePath();
      }
      ctx.fillStyle =
        region.color === "blue" ? COLORS.blueTerritory : COLORS.redTerritory;
      ctx.fill("evenodd");
    }

    for (const region of territories) {
      for (const ring of region.rings) {
        if (ring.length < 3) continue;
        ctx.beginPath();
        ring.forEach((p, i) => {
          const { cx, cy } = formalToCanvas(layout, board, p.x, p.y);
          if (i === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        });
        ctx.closePath();
        ctx.strokeStyle = region.color === "blue" ? COLORS.blue : COLORS.red;
        ctx.lineWidth = strokeW;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke();
      }
    }
  }

  const dotRadius = Math.max(2.5, cell * 0.28);

  // Placed points
  if (board.cells.length > 0) {
    for (let y = 1; y <= board.height; y += 1) {
      for (let x = 1; x <= board.width; x += 1) {
        const cellData = cellAt(board, x, y);
        if (!cellData?.color) continue;
        const { cx, cy } = formalToCanvas(layout, board, x, y);
        const radius = cellData.disabled
          ? dotRadius * CAPTURED_DOT_SCALE
          : dotRadius;
        ctx.beginPath();
        ctx.fillStyle = cellData.color === "blue" ? COLORS.blue : COLORS.red;
        if (cellData.disabled) {
          ctx.globalAlpha = 0.55;
        }
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  // Last-move double ring (Task 5)
  if (lastMove) {
    const { cx, cy } = formalToCanvas(layout, board, lastMove.x, lastMove.y);
    const stroke = lastMove.color === "blue" ? COLORS.blue : COLORS.red;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1.5, cell * 0.08);
    for (const pad of [3, 6]) {
      ctx.beginPath();
      ctx.arc(cx, cy, dotRadius + pad, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Hover preview — player color @ 85%, legal empty cells only
  if (hover && yourColor && isCellPlayable(board, hover.x, hover.y)) {
    const { cx, cy } = formalToCanvas(layout, board, hover.x, hover.y);
    ctx.beginPath();
    ctx.fillStyle = yourColor === "blue" ? COLORS.blue : COLORS.red;
    ctx.globalAlpha = HOVER_PREVIEW_ALPHA;
    ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Optimistic pending move
  if (pending) {
    const { cx, cy } = formalToCanvas(layout, board, pending.x, pending.y);
    ctx.beginPath();
    ctx.fillStyle = pending.color === "blue" ? COLORS.blue : COLORS.red;
    ctx.globalAlpha = 0.55;
    ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.strokeStyle = COLORS.pending;
    ctx.lineWidth = 1.5;
    ctx.arc(cx, cy, dotRadius + 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function layoutForContainer(
  board: Pick<WireBoard, "width" | "height">,
  width: number,
  height: number,
): BoardLayout {
  return computeLayout(board, width, height);
}
