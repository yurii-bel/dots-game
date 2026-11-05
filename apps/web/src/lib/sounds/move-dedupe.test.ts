import { afterEach, describe, expect, it } from "vitest";
import { resetMoveSoundDedupe, shouldPlayMoveSound } from "./move-dedupe";

afterEach(() => {
  resetMoveSoundDedupe();
});

describe("shouldPlayMoveSound", () => {
  it("allows the first accept for a moveNumber/requestId", () => {
    expect(
      shouldPlayMoveSound({
        gameId: "g1",
        moveNumber: 1,
        requestId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      }),
    ).toBe(true);
  });

  it("dedupes the same moveNumber", () => {
    shouldPlayMoveSound({
      gameId: "g1",
      moveNumber: 2,
      requestId: "11111111-1111-1111-1111-111111111111",
    });
    expect(
      shouldPlayMoveSound({
        gameId: "g1",
        moveNumber: 2,
        requestId: "22222222-2222-2222-2222-222222222222",
      }),
    ).toBe(false);
  });

  it("dedupes the same requestId (idempotent replay)", () => {
    const requestId = "33333333-3333-3333-3333-333333333333";
    shouldPlayMoveSound({ gameId: "g1", moveNumber: 3, requestId });
    expect(
      shouldPlayMoveSound({ gameId: "g1", moveNumber: 99, requestId }),
    ).toBe(false);
  });

  it("resets when gameId changes", () => {
    shouldPlayMoveSound({
      gameId: "g1",
      moveNumber: 1,
      requestId: "44444444-4444-4444-4444-444444444444",
    });
    expect(
      shouldPlayMoveSound({
        gameId: "g2",
        moveNumber: 1,
        requestId: "55555555-5555-5555-5555-555555555555",
      }),
    ).toBe(true);
  });
});
