"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerColor, WireBoard } from "@dots/shared";
import { canvasToFormal } from "./board-geometry";
import { drawBoard, isCellPlayable, layoutForContainer } from "./draw-board";

type GameBoardProps = {
  board: WireBoard;
  interactive: boolean;
  yourColor: PlayerColor | null;
  pending: { x: number; y: number; color: PlayerColor } | null;
  onPlace: (x: number, y: number) => void;
};

function pointerToLocal(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

export function GameBoard({
  board,
  interactive,
  yourColor,
  pending,
  onPlace,
}: GameBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 640, h: 520 });
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({
        w: Math.max(200, rect.width),
        h: Math.max(200, rect.height),
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = layoutForContainer(board, size.w, size.h);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.floor(layout.cssWidth * dpr);
    canvas.height = Math.floor(layout.cssHeight * dpr);
    canvas.style.width = `${layout.cssWidth}px`;
    canvas.style.height = `${layout.cssHeight}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawBoard(ctx, {
      board,
      layout,
      hover: interactive ? hover : null,
      yourColor,
      pending,
      dpr,
    });
  }, [board, layout, hover, pending, interactive, yourColor]);

  const resolvePoint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const local = pointerToLocal(canvas, clientX, clientY);
      return canvasToFormal(layout, board, local.x, local.y);
    },
    [layout, board],
  );

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!interactive) {
      setHover(null);
      return;
    }
    const point = resolvePoint(clientX, clientY);
    if (!point || !isCellPlayable(board, point.x, point.y)) {
      setHover(null);
      return;
    }
    setHover(point);
  };

  const handlePlace = (clientX: number, clientY: number) => {
    if (!interactive || !yourColor) return;
    const point = resolvePoint(clientX, clientY);
    if (!point) return;
    onPlace(point.x, point.y);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex h-full min-h-[280px] w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-white shadow-sm"
    >
      <canvas
        ref={canvasRef}
        className="touch-none max-h-full max-w-full cursor-default"
        role="img"
        aria-label="DOTS game board"
        onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => handlePlace(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (!t) return;
          handlePointerMove(t.clientX, t.clientY);
        }}
        onTouchMove={(e) => {
          const t = e.touches[0];
          if (!t) return;
          e.preventDefault();
          handlePointerMove(t.clientX, t.clientY);
        }}
        onTouchEnd={(e) => {
          const t = e.changedTouches[0];
          if (!t) return;
          e.preventDefault();
          handlePlace(t.clientX, t.clientY);
          setHover(null);
        }}
      />
    </div>
  );
}
