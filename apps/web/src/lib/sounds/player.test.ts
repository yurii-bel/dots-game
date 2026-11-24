import { describe, expect, it } from "vitest";
import {
  LEADING_SILENCE_THRESHOLD,
  SFX_MASTER_GAIN,
  leadingSilenceOffsetSeconds,
} from "./player";

describe("SFX_MASTER_GAIN", () => {
  it("stays at or below unity to avoid clipping the decoded buffer", () => {
    expect(SFX_MASTER_GAIN).toBeLessThanOrEqual(1);
    expect(SFX_MASTER_GAIN).toBeGreaterThan(0);
  });
});

describe("leadingSilenceOffsetSeconds", () => {
  it("returns 0 for empty input", () => {
    expect(leadingSilenceOffsetSeconds([], 44100)).toBe(0);
  });

  it("skips leading frames below the threshold", () => {
    const silent = new Float32Array(4410); // 100ms @ 44.1kHz
    const active = new Float32Array(100);
    active[0] = LEADING_SILENCE_THRESHOLD + 0.001;
    const channel = new Float32Array(silent.length + active.length);
    channel.set(silent, 0);
    channel.set(active, silent.length);

    expect(leadingSilenceOffsetSeconds([channel], 44100)).toBeCloseTo(0.1, 5);
  });

  it("uses the earliest non-silent sample across channels", () => {
    const left = new Float32Array(10);
    const right = new Float32Array(10);
    right[4] = 0.5;

    expect(leadingSilenceOffsetSeconds([left, right], 10)).toBeCloseTo(0.4, 5);
  });

  it("returns 0 when the whole buffer stays silent", () => {
    const channel = new Float32Array(32);
    expect(leadingSilenceOffsetSeconds([channel], 16000)).toBe(0);
  });
});
