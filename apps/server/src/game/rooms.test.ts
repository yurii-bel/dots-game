import { describe, expect, it, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import { GameRoomRegistry, timingFields } from "./rooms.js";

describe("GameRoomRegistry", () => {
  let registry: GameRoomRegistry;

  beforeEach(() => {
    registry = new GameRoomRegistry();
  });

  it("creates a matchmaking game with real player ids and accepts a move", async () => {
    const blueId = randomUUID();
    const redId = randomUUID();

    const game = await registry.createMatchmakingGame({
      blue: { playerId: blueId, socketId: "s1" },
      red: { playerId: redId, socketId: "s2" },
    });

    expect(game.engine?.players.blue).toBe(blueId);
    expect(game.engine?.players.red).toBe(redId);
    expect(game.engine?.currentPlayer).toBe("blue");
    expect(game.engine?.moveNumber).toBe(0);

    // Place near initial cross; empty playable cell away from cross.
    const result = registry.applyPlayerMove({
      gameId: game.id,
      playerId: blueId,
      x: 1,
      y: 1,
      expectedVersion: 0,
      requestId: randomUUID(),
    });

    expect(result.kind).toBe("accepted");
    if (result.kind === "accepted") {
      expect(result.payload.state.version).toBe(1);
      expect(result.payload.state.currentPlayer).toBe("red");
    }
  });

  it("rejects version mismatch and replays idempotent requestId", async () => {
    const blueId = randomUUID();
    const redId = randomUUID();
    const game = await registry.createMatchmakingGame({
      blue: { playerId: blueId, socketId: "s1" },
      red: { playerId: redId, socketId: "s2" },
    });

    const requestId = randomUUID();
    const first = registry.applyPlayerMove({
      gameId: game.id,
      playerId: blueId,
      x: 1,
      y: 1,
      expectedVersion: 0,
      requestId,
    });
    expect(first.kind).toBe("accepted");

    const stale = registry.applyPlayerMove({
      gameId: game.id,
      playerId: redId,
      x: 2,
      y: 1,
      expectedVersion: 0,
      requestId: randomUUID(),
    });
    expect(stale.kind).toBe("rejected");
    if (stale.kind === "rejected") {
      expect(stale.payload.code).toBe("VERSION_MISMATCH");
    }

    const replay = registry.applyPlayerMove({
      gameId: game.id,
      playerId: blueId,
      x: 1,
      y: 1,
      expectedVersion: 0,
      requestId,
    });
    expect(replay.kind).toBe("accepted");
    if (replay.kind === "accepted" && first.kind === "accepted") {
      expect(replay.payload.state.version).toBe(first.payload.state.version);
    }
  });

  it("supports private room create + join with distinct ids", async () => {
    const host = randomUUID();
    const guest = randomUUID();

    const { game, roomCode } = await registry.createPrivateRoom({
      playerId: host,
      socketId: "host",
    });
    expect(game.status).toBe("waiting");
    expect(roomCode).toHaveLength(6);
    expect(game.startedAt).toBeNull();
    expect(timingFields(game)).toEqual({});

    const joined = await registry.joinPrivateRoom({
      gameIdOrCode: roomCode,
      playerId: guest,
      socketId: "guest",
    });

    expect(joined.justStarted).toBe(true);
    expect(joined.game.engine?.players.blue).toBe(host);
    expect(joined.game.engine?.players.red).toBe(guest);
    expect(joined.game.startedAt).toEqual(expect.any(Number));
    expect(timingFields(joined.game)).toEqual({ startedAt: joined.game.startedAt });
  });

  it("sets startedAt at startEngine and finishedAt on resign", async () => {
    const blueId = randomUUID();
    const redId = randomUUID();
    const before = Date.now();
    const game = await registry.createMatchmakingGame({
      blue: { playerId: blueId, socketId: "s1" },
      red: { playerId: redId, socketId: "s2" },
    });
    const afterStart = Date.now();

    expect(game.startedAt).toBeGreaterThanOrEqual(before);
    expect(game.startedAt).toBeLessThanOrEqual(afterStart);
    expect(game.finishedAt).toBeNull();

    const resigned = registry.resign(game.id, blueId);
    expect(resigned?.finishedAt).toEqual(expect.any(Number));
    expect(resigned!.finishedAt!).toBeGreaterThanOrEqual(resigned!.startedAt!);
    expect(timingFields(resigned!)).toEqual({
      startedAt: resigned!.startedAt,
      finishedAt: resigned!.finishedAt,
    });
  });

  it("reattaches socket on reconnect via sync path", async () => {
    const blueId = randomUUID();
    const redId = randomUUID();
    const game = await registry.createMatchmakingGame({
      blue: { playerId: blueId, socketId: "s1" },
      red: { playerId: redId, socketId: "s2" },
    });

    const left = registry.markDisconnected("s1");
    expect(left?.playerId).toBe(blueId);
    expect(game.seats.blue?.connected).toBe(false);

    const color = registry.attachSocket(game, blueId, "s1-new");
    expect(color).toBe("blue");
    expect(game.seats.blue?.connected).toBe(true);
    expect(game.seats.blue?.socketId).toBe("s1-new");
  });

  it("destroys empty waiting private room on host leave and invalidates code", async () => {
    const host = randomUUID();
    const { game, roomCode } = await registry.createPrivateRoom({
      playerId: host,
      socketId: "host",
    });

    const result = registry.leave(game.id, host);
    expect(result?.kind).toBe("destroyed");
    expect(registry.get(game.id)).toBeUndefined();
    expect(registry.findByRoomCode(roomCode)).toBeUndefined();
    expect(registry.findByPlayer(host)).toBeUndefined();

    // Host can create a new room after leaving.
    const again = await registry.createPrivateRoom({
      playerId: host,
      socketId: "host-2",
    });
    expect(again.game.status).toBe("waiting");
  });

  it("leave during in-progress resigns (private or matchmaking)", async () => {
    const blueId = randomUUID();
    const redId = randomUUID();
    const game = await registry.createMatchmakingGame({
      blue: { playerId: blueId, socketId: "s1" },
      red: { playerId: redId, socketId: "s2" },
    });

    const result = registry.leave(game.id, blueId);
    expect(result?.kind).toBe("resigned");
    expect(game.status).toBe("finished");
    expect(game.finishedReason).toBe("resign");
    expect(game.winner).toBe("red");
    // Soft reconnect of the same id into a finished game seat is still possible.
    expect(registry.colorOf(game, blueId)).toBe("blue");
  });

  it("soft disconnect keeps in-progress seat reclaimable by same playerId", async () => {
    const blueId = randomUUID();
    const redId = randomUUID();
    const game = await registry.createMatchmakingGame({
      blue: { playerId: blueId, socketId: "s1" },
      red: { playerId: redId, socketId: "s2" },
    });

    registry.markDisconnected("s1");
    const rejoined = await registry.joinPrivateRoom({
      gameIdOrCode: game.id,
      playerId: blueId,
      socketId: "s1-re",
    });
    expect(rejoined.color).toBe("blue");
    expect(rejoined.justStarted).toBe(false);
    expect(game.seats.blue?.connected).toBe(true);
    expect(game.status).toBe("in_progress");
  });

});
