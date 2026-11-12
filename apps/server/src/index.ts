import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { getEngineStatus } from "@dots/game-engine";
import { APP_NAME, HealthResponseSchema } from "@dots/shared";
import { env } from "./env.js";
import { verifyClerkSocketToken } from "./auth/clerk.js";
import { loadSocketUser } from "./auth/socket-user.js";
import { registerSocketHandlers } from "./socket/handlers.js";

const app = express();
app.use(
  cors({
    origin: env.CORS_ORIGIN,
  }),
);
app.use(express.json());

app.get("/health", (_req, res) => {
  const payload = HealthResponseSchema.parse({
    ok: true as const,
    service: "server",
    timestamp: new Date().toISOString(),
  });
  res.json({
    ...payload,
    app: APP_NAME,
    engine: getEngineStatus(),
    multiplayer: true,
    auth: "clerk",
  });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: env.CORS_ORIGIN,
  },
  // Re-run auth middleware on recovery so JWT is always verified.
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: false,
  },
});

io.use((socket, next) => {
  void (async () => {
    try {
      const { clerkId } = await verifyClerkSocketToken(socket.handshake.auth);
      const user = await loadSocketUser(clerkId);
      socket.data.user = user;
      next();
    } catch (err) {
      const message = err instanceof Error ? err.message : "UNAUTHORIZED";
      next(new Error(message === "NICKNAME_REQUIRED" ? "NICKNAME_REQUIRED" : "UNAUTHORIZED"));
    }
  })();
});

io.on("connection", (socket) => {
  registerSocketHandlers(io, socket);
});

httpServer.listen(env.PORT, () => {
  console.log(`[${APP_NAME}] Socket.IO multiplayer server listening on :${env.PORT}`);
});
