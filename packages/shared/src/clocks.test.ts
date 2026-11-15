import { describe, expect, it } from "vitest";
import {
  MAIN_TIME_MS,
  TURN_BANK_MS,
  createInitialClocks,
  displayClockMs,
  refillTurnBank,
  tickActiveClock,
} from "./clocks";

describe("tickActiveClock", () => {
  it("spends turn bank before main", () => {
    const clocks = createInitialClocks();
    const { clocks: after, timedOut } = tickActiveClock(clocks, "blue", 5_000);
    expect(timedOut).toBe(false);
    expect(after.blue.turnBankMs).toBe(TURN_BANK_MS - 5_000);
    expect(after.blue.mainMs).toBe(MAIN_TIME_MS);
    expect(after.red).toEqual(clocks.red);
  });

  it("drains main after bank hits zero", () => {
    const clocks = createInitialClocks();
    const { clocks: after, timedOut } = tickActiveClock(
      clocks,
      "red",
      TURN_BANK_MS + 3_000,
    );
    expect(timedOut).toBe(false);
    expect(after.red.turnBankMs).toBe(0);
    expect(after.red.mainMs).toBe(MAIN_TIME_MS - 3_000);
  });

  it("times out when main reaches zero with bank already empty", () => {
    const clocks = {
      blue: { turnBankMs: 0, mainMs: 2_000 },
      red: { turnBankMs: TURN_BANK_MS, mainMs: MAIN_TIME_MS },
    };
    const { clocks: after, timedOut } = tickActiveClock(clocks, "blue", 2_500);
    expect(timedOut).toBe(true);
    expect(after.blue.turnBankMs).toBe(0);
    expect(after.blue.mainMs).toBe(0);
  });

  it("no-ops for non-positive elapsed", () => {
    const clocks = createInitialClocks();
    const { clocks: after, timedOut } = tickActiveClock(clocks, "blue", 0);
    expect(timedOut).toBe(false);
    expect(after).toEqual(clocks);
  });
});

describe("refillTurnBank", () => {
  it("restores next player's bank without changing mains", () => {
    const clocks = {
      blue: { turnBankMs: 4_000, mainMs: MAIN_TIME_MS - 10_000 },
      red: { turnBankMs: 0, mainMs: MAIN_TIME_MS - 30_000 },
    };
    const after = refillTurnBank(clocks, "red");
    expect(after.red.turnBankMs).toBe(TURN_BANK_MS);
    expect(after.red.mainMs).toBe(MAIN_TIME_MS - 30_000);
    expect(after.blue).toEqual(clocks.blue);
  });
});

describe("displayClockMs", () => {
  it("shows bank while active with bank remaining", () => {
    expect(
      displayClockMs({ turnBankMs: 12_000, mainMs: MAIN_TIME_MS }, true),
    ).toBe(12_000);
  });

  it("shows main when inactive or bank empty", () => {
    expect(
      displayClockMs({ turnBankMs: 12_000, mainMs: MAIN_TIME_MS }, false),
    ).toBe(MAIN_TIME_MS);
    expect(displayClockMs({ turnBankMs: 0, mainMs: 90_000 }, true)).toBe(90_000);
  });
});
