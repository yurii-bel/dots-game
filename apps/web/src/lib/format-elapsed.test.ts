import { describe, expect, it } from "vitest";
import { formatElapsed } from "./format-elapsed";

describe("formatElapsed", () => {
  it("formats zero and sub-minute", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(999)).toBe("0:00");
    expect(formatElapsed(1000)).toBe("0:01");
    expect(formatElapsed(65_000)).toBe("1:05");
  });

  it("keeps minutes past 60 (no hours roll-up)", () => {
    expect(formatElapsed(3 * 60_000 + 5_000)).toBe("3:05");
    expect(formatElapsed(65 * 60_000 + 9_000)).toBe("65:09");
  });

  it("clamps negative to 0:00", () => {
    expect(formatElapsed(-500)).toBe("0:00");
  });
});
