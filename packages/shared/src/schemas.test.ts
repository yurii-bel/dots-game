import { describe, expect, it } from "vitest";
import { HealthResponseSchema } from "./schemas";
import {
  GameMovePayloadSchema,
  SocketEvents,
  WireGameStateSchema,
} from "./socket";

describe("HealthResponseSchema", () => {
  it("accepts a valid health payload", () => {
    const parsed = HealthResponseSchema.parse({
      ok: true,
      service: "server",
      timestamp: new Date().toISOString(),
    });
    expect(parsed.ok).toBe(true);
  });
});

describe("socket contracts", () => {
  it("exposes stable event names", () => {
    expect(SocketEvents.gameMove).toBe("game:move");
    expect(SocketEvents.gameMoveAccepted).toBe("game:move:accepted");
    expect(SocketEvents.gameLeave).toBe("game:leave");
  });

  it("validates a move payload", () => {
    const playerId = "11111111-1111-4111-8111-111111111111";
    const parsed = GameMovePayloadSchema.parse({
      gameId: "game_1",
      playerId,
      x: 20,
      y: 18,
      expectedVersion: 0,
      requestId: "22222222-2222-4222-8222-222222222222",
    });
    expect(parsed.expectedVersion).toBe(0);
  });

  it("rejects invalid wire state", () => {
    expect(() =>
      WireGameStateSchema.parse({
        gameId: "g",
        ruleset: "classic",
        rulesetVersion: "2017.1",
        board: { width: 2, height: 2, cells: [] },
        currentPlayer: "green",
        players: {
          blue: "11111111-1111-4111-8111-111111111111",
          red: "22222222-2222-4222-8222-222222222222",
        },
        scores: { blue: 0, red: 0 },
        version: 0,
        status: "in_progress",
      }),
    ).toThrow();
  });
});
