"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerColor, WireBoard } from "@dots/shared";
import { canvasToFormal } from "./board-geometry";
import {
  captureRevealOpacities,
  diffNewlyCapturedIndices,
  isCaptureRevealComplete,
  prefersReducedMotion,
} from "./capture-reveal";
import {
  drawBoard,
  isCellPlayable,
  layoutForContainer,
  type LastMoveHighlight,
} from "./draw-board";

type GameBoardProps = {
  board: WireBoard;
  interactive: boolean;
  yourColor: PlayerColor | null;
  pending: { x: number; y: number; color: PlayerColor } | null;
  lastMove: LastMoveHighlight | null;
  onPlace: (x: number, y: number) => void;
  /**
   * When true (Declare grounding finished), stagger-fade newly captured
   * §8.4 cells on this canvas. Engine state is already final.
   */
  animateLandingReveal?: boolean;
  /** Stable key so we animate once per finished landing game. */
  landingRevealKey?: string | null;
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
  lastMove,
  onPlace,
  animateLandingReveal = false,
  landingRevealKey = null,
}: GameBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** Last in-progress board — kept through landing so §8.4 forfeits can be diffed. */
  const baselineBoardRef = useRef<WireBoard | null>(null);
  const animatedKeyRef = useRef<string | null>(null);
  const [size, setSize] = useState({ w: 640, h: 520 });
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [captureReveal, setCaptureReveal] = useState<Map<
    number,
    number
  > | null>(null);

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

  // Track the live board while playing so landing can diff §8.4 forfeits.
  useEffect(() => {
    if (!animateLandingReveal) {
      baselineBoardRef.current = board;
      animatedKeyRef.current = null;
      setCaptureReveal(null);
    }
  }, [board, animateLandingReveal]);

  // Client-only stagger/fade of newly captured cells after Declare grounding.
  useEffect(() => {
    if (!animateLandingReveal || !landingRevealKey) return;
    if (animatedKeyRef.current === landingRevealKey) return;

    const prev = baselineBoardRef.current;
    // Skip hydrate/sync of an already-finished game (no in-progress baseline).
    if (!prev || prev.cells.length === 0) {
      animatedKeyRef.current = landingRevealKey;
      setCaptureReveal(null);
      return;
    }

    const newly = diffNewlyCapturedIndices(prev, board);

    if (newly.length === 0 || prefersReducedMotion()) {
      animatedKeyRef.current = landingRevealKey;
      setCaptureReveal(null);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const opacities = captureRevealOpacities(newly, now - start);
      if (isCaptureRevealComplete(opacities)) {
        animatedKeyRef.current = landingRevealKey;
        setCaptureReveal(null);
        return;
      }
      setCaptureReveal(opacities);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // Key is set only on completion / skip so Strict Mode remount can restart.
    return () => cancelAnimationFrame(raf);
  }, [animateLandingReveal, landingRevealKey, board]);

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
      lastMove,
      dpr,
      captureReveal,
    });
  }, [
    board,
    layout,
    hover,
    pending,
    lastMove,
    interactive,
    yourColor,
    captureReveal,
  ]);

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
    // Snap to nearest intersection (no mid-cell dead zone). Clear only when
    // off-canvas (null) or the cell is not a legal empty intersection.
    const point = resolvePoint(clientX, clientY);
    if (!point || !isCellPlayable(board, point.x, point.y)) {
      setHover(null);
      return;
    }
    setHover((prev) =>
      prev && prev.x === point.x && prev.y === point.y ? prev : point,
    );
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
