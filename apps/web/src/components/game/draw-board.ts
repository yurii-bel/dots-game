import type { PlayerColor, WireBoard, WireCell } from "@dots/shared";
import { computeLayout, formalToCanvas, type BoardLayout } from "./board-geometry";

const COLORS = {
  grid: "#c8cdd5",
  gridMajor: "#aeb6c2",
  paper: "#ffffff",
  blue: "#1d4ed8",
  red: "#dc2626",
  blueTerritory: "rgba(37, 99, 235, 0.22)",
  redTerritory: "rgba(220, 38, 38, 0.22)",
  pending: "rgba(15, 23, 42, 0.35)",
  hover: "rgba(15, 23, 42, 0.18)",
} as const;

function cellAt(board: WireBoard, x: number, y: number): WireCell | null {
  if (board.cells.length === 0) return null;
  const idx = (y - 1) * board.width + (x - 1);
  return board.cells[idx] ?? null;
}

export type DrawOptions = {
  board: WireBoard;
  layout: BoardLayout;
  hover: { x: number; y: number } | null;
  pending: { x: number; y: number; color: PlayerColor } | null;
  dpr: number;
};

export function drawBoard(
  ctx: CanvasRenderingContext2D,
  { board, layout, hover, pending, dpr }: DrawOptions,
): void {
  const { cssWidth, cssHeight, cell } = layout;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  // Paper background
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, cssWidth, cssHeight);

  // Territories under the grid
  if (board.cells.length > 0) {
    for (let y = 1; y <= board.height; y += 1) {
      for (let x = 1; x <= board.width; x += 1) {
        const cellData = cellAt(board, x, y);
        if (!cellData?.capturedBy) continue;
        const { cx, cy } = formalToCanvas(layout, board, x, y);
        ctx.fillStyle =
          cellData.capturedBy === "blue" ? COLORS.blueTerritory : COLORS.redTerritory;
        // Diamond-ish fill covering the intersection neighborhood
        const half = cell * 0.5;
        ctx.fillRect(cx - half, cy - half, cell, cell);
      }
    }
  }

  // Grid lines
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

  const dotRadius = Math.max(2.5, cell * 0.28);

  // Placed points
  if (board.cells.length > 0) {
    for (let y = 1; y <= board.height; y += 1) {
      for (let x = 1; x <= board.width; x += 1) {
        const cellData = cellAt(board, x, y);
        if (!cellData?.color) continue;
        const { cx, cy } = formalToCanvas(layout, board, x, y);
        ctx.beginPath();
        ctx.fillStyle = cellData.color === "blue" ? COLORS.blue : COLORS.red;
        if (cellData.disabled) {
          ctx.globalAlpha = 0.55;
        }
        ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  // Hover ghost
  if (hover) {
    const { cx, cy } = formalToCanvas(layout, board, hover.x, hover.y);
    ctx.beginPath();
    ctx.fillStyle = COLORS.hover;
    ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
    ctx.fill();
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
