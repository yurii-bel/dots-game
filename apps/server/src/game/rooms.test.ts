import { describe, expect, it, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import { GameRoomRegistry, timingFields } from "./rooms.js";

function seatInput(suffix: string) {
  return {
    userId: `user_${suffix}`,
    nickname: `Nick_${suffix}`,
    socketId: `sock_${suffix}`,
  };
}

describe("GameRoomRegistry", () => {
  let registry: GameRoomRegistry;

  beforeEach(() => {
    registry = new GameRoomRegistry();
  });

  it("creates a matchmaking game with server seat ids and accepts a move", async () => {
    const blue = seatInput("blue");
    const red = seatInput("red");

    const game = await registry.createMatchmakingGame({ blue, red });

    const blueId = game.seats.blue!.playerId;
    const redId = game.seats.red!.playerId;
    expect(game.engine?.players.blue).toBe(blueId);
    expect(game.engine?.players.red).toBe(redId);
    expect(game.seats.blue?.userId).toBe(blue.userId);
    expect(game.seats.red?.nickname).toBe(red.nickname);
    expect(game.engine?.currentPlayer).toBe("blue");
    expect(game.engine?.moveNumber).toBe(0);

    const wire = registry.wire(game)!;
    expect(wire.nicknames).toEqual({
      blue: blue.nickname,
      red: red.nickname,
    });

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
      expect(result.payload.state.nicknames.blue).toBe(blue.nickname);
    }
  });

  it("rejects version mismatch and replays idempotent requestId", async () => {
    const game = await registry.createMatchmakingGame({
      blue: seatInput("b"),
      red: seatInput("r"),
    });
    const blueId = game.seats.blue!.playerId;
    const redId = game.seats.red!.playerId;

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

  it("supports private room create + join with distinct userIds", async () => {
    const host = seatInput("host");
    const guest = seatInput("guest");

    const { game, roomCode, playerId: hostSeat } = await registry.createPrivateRoom(host);
    expect(game.status).toBe("waiting");
    expect(roomCode).toHaveLength(6);
    expect(game.startedAt).toBeNull();
    expect(timingFields(game)).toEqual({});
    expect(hostSeat).toBe(game.seats.blue!.playerId);

    const joined = await registry.joinPrivateRoom({
      gameIdOrCode: roomCode,
      ...guest,
    });

    expect(joined.justStarted).toBe(true);
    expect(joined.game.engine?.players.blue).toBe(hostSeat);
    expect(joined.game.engine?.players.red).toBe(joined.playerId);
    expect(joined.game.startedAt).toEqual(expect.any(Number));
    expect(timingFields(joined.game)).toEqual({ startedAt: joined.game.startedAt });
  });

  it("reconnects by userId and reuses the same seat playerId", async () => {
    const blue = seatInput("blue");
    const red = seatInput("red");
    const game = await registry.createMatchmakingGame({ blue, red });
    const originalPlayerId = game.seats.blue!.playerId;

    registry.markDisconnected(blue.socketId);
    expect(game.seats.blue?.connected).toBe(false);

    const found = registry.findByUser(blue.userId);
    expect(found?.id).toBe(game.id);

    const color = registry.attachSocketByUser(game, blue.userId, "sock_blue_new");
    expect(color).toBe("blue");
    expect(game.seats.blue?.playerId).toBe(originalPlayerId);
    expect(game.seats.blue?.socketId).toBe("sock_blue_new");
  });

  it("sets startedAt at startEngine and finishedAt on resign", async () => {
    const before = Date.now();
    const game = await registry.createMatchmakingGame({
      blue: seatInput("b2"),
      red: seatInput("r2"),
    });
    const afterStart = Date.now();

    expect(game.startedAt).toBeGreaterThanOrEqual(before);
    expect(game.startedAt).toBeLessThanOrEqual(afterStart);
    expect(game.finishedAt).toBeNull();

    const blueId = game.seats.blue!.playerId;
    const resigned = registry.resign(game.id, blueId);
    expect(resigned?.finishedAt).toEqual(expect.any(Number));
    expect(resigned!.finishedAt!).toBeGreaterThanOrEqual(resigned!.startedAt!);
    expect(timingFields(resigned!)).toEqual({
      startedAt: resigned!.startedAt,
      finishedAt: resigned!.finishedAt,
    });
  });

  it("reattaches socket on reconnect via sync path", async () => {
    const blue = seatInput("b3");
    const red = seatInput("r3");
    const game = await registry.createMatchmakingGame({ blue, red });

    const left = registry.markDisconnected(blue.socketId);
    expect(left?.playerId).toBe(game.seats.blue!.playerId);
    expect(game.seats.blue?.connected).toBe(false);

    const color = registry.attachSocketByUser(game, blue.userId, "s1-new");
    expect(color).toBe("blue");
    expect(game.seats.blue?.connected).toBe(true);
    expect(game.seats.blue?.socketId).toBe("s1-new");
  });

  it("destroys empty waiting private room on host leave and invalidates code", async () => {
    const host = seatInput("host2");
    const { game, roomCode } = await registry.createPrivateRoom(host);

    const result = registry.leave(game.id, host.userId);
    expect(result?.kind).toBe("destroyed");
    expect(registry.get(game.id)).toBeUndefined();
    expect(registry.findByRoomCode(roomCode)).toBeUndefined();
    expect(registry.findByUser(host.userId)).toBeUndefined();

    const again = await registry.createPrivateRoom({
      ...host,
      socketId: "host-2",
    });
    expect(again.game.status).toBe("waiting");
  });

  it("leave during in-progress resigns (private or matchmaking)", async () => {
    const blue = seatInput("b4");
    const red = seatInput("r4");
    const game = await registry.createMatchmakingGame({ blue, red });

    const result = registry.leave(game.id, blue.userId);
    expect(result?.kind).toBe("resigned");
    expect(game.status).toBe("finished");
    expect(game.finishedReason).toBe("resign");
    expect(game.winner).toBe("red");
    expect(registry.colorOfUser(game, blue.userId)).toBe("blue");
  });

  it("soft disconnect keeps in-progress seat reclaimable by same userId", async () => {
    const blue = seatInput("b5");
    const red = seatInput("r5");
    const game = await registry.createMatchmakingGame({ blue, red });
    const originalPlayerId = game.seats.blue!.playerId;

    registry.markDisconnected(blue.socketId);
    const rejoined = await registry.joinPrivateRoom({
      gameIdOrCode: game.id,
      ...blue,
      socketId: "s1-re",
    });
    expect(rejoined.color).toBe("blue");
    expect(rejoined.justStarted).toBe(false);
    expect(rejoined.playerId).toBe(originalPlayerId);
    expect(game.seats.blue?.connected).toBe(true);
    expect(game.status).toBe("in_progress");
  });
});
