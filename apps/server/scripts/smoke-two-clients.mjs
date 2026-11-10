/**
 * Smoke: two Socket.IO clients complete a private-room game move exchange.
 * Requires two Clerk session JWTs (users with nicknames already set).
 *
 * Usage:
 *   SMOKE_TOKEN_A=<jwt> SMOKE_TOKEN_B=<jwt> node apps/server/scripts/smoke-two-clients.mjs
 */
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(__dirname, "../../../apps/web/package.json"));
const { io } = require("socket.io-client");

const URL = process.env.SOCKET_URL ?? "http://localhost:4000";
const TOKEN_A = process.env.SMOKE_TOKEN_A;
const TOKEN_B = process.env.SMOKE_TOKEN_B;

function client(token) {
  const socket = io(URL, {
    transports: ["websocket"],
    auth: { token },
  });
  return { socket };
}

function once(socket, event, pred, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), timeoutMs);
    const handler = (payload) => {
      if (pred && !pred(payload)) return;
      socket.off(event, handler);
      clearTimeout(t);
      resolve(payload);
    };
    socket.on(event, handler);
  });
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  if (!TOKEN_A || !TOKEN_B) {
    throw new Error("Set SMOKE_TOKEN_A and SMOKE_TOKEN_B to Clerk session JWTs");
  }

  const a = client(TOKEN_A);
  const b = client(TOKEN_B);

  await Promise.all([
    once(a.socket, "connect"),
    once(b.socket, "connect"),
  ]);
  console.log("connected");

  const createAck = await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("create timeout")), 5000);
    a.socket.emit("game:create", {}, (ack) => {
      clearTimeout(t);
      resolve(ack);
    });
  });
  console.log("created", createAck);
  assert(createAck.roomCode, "missing room code");
  assert(createAck.playerId, "missing seat playerId");

  const startedA = once(
    a.socket,
    "game:started",
    (p) => p.state?.board?.cells?.length > 0,
  );
  const startedB = once(
    b.socket,
    "game:started",
    (p) => p.state?.board?.cells?.length > 0,
  );

  b.socket.emit("game:join", {
    gameId: createAck.roomCode,
  });

  const [sa, sb] = await Promise.all([startedA, startedB]);
  console.log("started", {
    aColor: sa.color,
    bColor: sb.color,
    version: sa.state.version,
    cells: sa.state.board.cells.length,
    nicknames: sa.state.nicknames,
  });
  assert(sa.state.board.cells.length === 39 * 32, "expected full classic board");
  assert(sa.color === "blue" && sb.color === "red", "seat colors");
  assert(sa.state.nicknames.blue && sa.state.nicknames.red, "nicknames on wire");

  const gameId = sa.gameId;
  const req1 = randomUUID();
  const move1 = once(
    a.socket,
    "game:move:accepted",
    (p) => p.requestId === req1,
  );
  a.socket.emit("game:move", {
    gameId,
    x: 1,
    y: 1,
    expectedVersion: 0,
    requestId: req1,
  });
  const m1 = await move1;
  assert(m1.state.version === 1, "version after move1");
  assert(m1.move.color === "blue", "blue moved");
  console.log("move1 ok v", m1.state.version);

  const req2 = randomUUID();
  const move2 = once(
    b.socket,
    "game:move:accepted",
    (p) => p.requestId === req2,
  );
  b.socket.emit("game:move", {
    gameId,
    x: 2,
    y: 1,
    expectedVersion: 1,
    requestId: req2,
  });
  const m2 = await move2;
  assert(m2.state.version === 2, "version after move2");
  assert(m2.move.color === "red", "red moved");
  console.log("move2 ok v", m2.state.version);

  // Idempotent replay of req2
  const replay = once(
    b.socket,
    "game:move:accepted",
    (p) => p.requestId === req2 && p.state.version === 2,
  );
  b.socket.emit("game:move", {
    gameId,
    x: 2,
    y: 1,
    expectedVersion: 1,
    requestId: req2,
  });
  await replay;
  console.log("idempotent replay ok");

  // Reconnect + sync (same JWT → same userId seat)
  a.socket.disconnect();
  await new Promise((r) => setTimeout(r, 150));
  a.socket.connect();
  await once(a.socket, "connect");
  const synced = once(a.socket, "game:state", (p) => p.state?.version === 2);
  a.socket.emit("game:sync", { gameId });
  const syncState = await synced;
  assert(syncState.yourColor === "blue", "resync color");
  console.log("resync ok", syncState.state.version);

  console.log("SMOKE OK");
  a.socket.close();
  b.socket.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("SMOKE FAIL", err);
  process.exit(1);
});
