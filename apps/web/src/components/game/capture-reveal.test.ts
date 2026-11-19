import { describe, expect, it } from "vitest";
import type { WireBoard, WireCell } from "@dots/shared";
import {
  CAPTURE_REVEAL_FADE_MS,
  CAPTURE_REVEAL_STAGGER_MS,
  captureRevealDurationMs,
  captureRevealOpacities,
  diffNewlyCapturedIndices,
  isCaptureRevealComplete,
} from "./capture-reveal";

function cell(partial: Partial<WireCell> = {}): WireCell {
  return {
    color: null,
    disabled: false,
    capturedBy: null,
    ...partial,
  };
}

function board(cells: WireCell[]): WireBoard {
  return { width: cells.length, height: 1, cells };
}

describe("diffNewlyCapturedIndices", () => {
  it("returns empty when next has no captures", () => {
    const next = board([cell(), cell()]);
    expect(diffNewlyCapturedIndices(null, next)).toEqual([]);
  });

  it("treats all captures as new when prev is missing", () => {
    const next = board([
      cell({ color: "red", disabled: true, capturedBy: "blue" }),
      cell(),
      cell({ color: "blue", disabled: true, capturedBy: "red" }),
    ]);
    expect(diffNewlyCapturedIndices(null, next)).toEqual([0, 2]);
  });

  it("returns only newly awarded §8.4-style forfeits", () => {
    const prev = board([
      cell({ color: "red", disabled: true, capturedBy: "blue" }),
      cell({ color: "blue", disabled: false, capturedBy: null }),
      cell(),
    ]);
    const next = board([
      cell({ color: "red", disabled: true, capturedBy: "blue" }),
      cell({ color: "blue", disabled: true, capturedBy: "red" }),
      cell({ color: null, disabled: true, capturedBy: "red" }),
    ]);
    expect(diffNewlyCapturedIndices(prev, next)).toEqual([1, 2]);
  });
});

describe("captureRevealOpacities", () => {
  it("keeps later cells at 0 until their stagger starts", () => {
    const map = captureRevealOpacities([4, 1, 7], 0);
    expect(map.get(1)).toBe(0);
    expect(map.get(4)).toBe(0);
    expect(map.get(7)).toBe(0);
  });

  it("staggers fades in sorted index order", () => {
    const map = captureRevealOpacities(
      [4, 1],
      CAPTURE_REVEAL_STAGGER_MS + CAPTURE_REVEAL_FADE_MS / 2,
    );
    expect(map.get(1)!).toBeGreaterThan(0.4);
    expect(map.get(1)!).toBeLessThan(1);
    expect(map.get(4)!).toBeGreaterThan(0);
    expect(map.get(4)!).toBeLessThan(map.get(1)!);
  });

  it("snaps to full opacity when reduced motion is set", () => {
    const map = captureRevealOpacities([2, 5], 0, { reducedMotion: true });
    expect(map.get(2)).toBe(1);
    expect(map.get(5)).toBe(1);
    expect(isCaptureRevealComplete(map)).toBe(true);
  });
});

describe("captureRevealDurationMs", () => {
  it("covers fade plus staggers", () => {
    expect(captureRevealDurationMs(0)).toBe(0);
    expect(captureRevealDurationMs(1)).toBe(CAPTURE_REVEAL_FADE_MS);
    expect(captureRevealDurationMs(3)).toBe(
      CAPTURE_REVEAL_FADE_MS + 2 * CAPTURE_REVEAL_STAGGER_MS,
    );
  });
});
