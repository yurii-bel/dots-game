import { describe, expect, it } from "vitest";
import { HealthResponseSchema } from "./schemas";
import {
  GameFinishedPayloadSchema,
  GameMovePayloadSchema,
  GameStartedPayloadSchema,
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

  it("validates a move payload without client identity", () => {
    const parsed = GameMovePayloadSchema.parse({
      gameId: "game_1",
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
        nicknames: { blue: "A", red: "B" },
        scores: { blue: 0, red: 0 },
        version: 0,
        status: "in_progress",
      }),
    ).toThrow();
  });

  it("accepts optional timing fields on start/finished payloads", () => {
    const blue = "11111111-1111-4111-8111-111111111111";
    const red = "22222222-2222-4222-8222-222222222222";
    const state = {
      gameId: "g1",
      ruleset: "classic" as const,
      rulesetVersion: "2017.1",
      board: { width: 2, height: 2, cells: [] },
      currentPlayer: "blue" as const,
      players: { blue, red },
      nicknames: { blue: "BlueNick", red: "RedNick" },
      scores: { blue: 0, red: 0 },
      version: 0,
      status: "in_progress" as const,
    };

    const started = GameStartedPayloadSchema.parse({
      gameId: "g1",
      color: "blue",
      state,
      startedAt: 1_700_000_000_000,
    });
    expect(started.startedAt).toBe(1_700_000_000_000);
    expect(started.finishedAt).toBeUndefined();

    const finished = GameFinishedPayloadSchema.parse({
      gameId: "g1",
      reason: "resign",
      winner: "red",
      state: { ...state, status: "finished" },
      startedAt: 1_700_000_000_000,
      finishedAt: 1_700_000_065_000,
    });
    expect(finished.finishedAt).toBe(1_700_000_065_000);
  });
});
