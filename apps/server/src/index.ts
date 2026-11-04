import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { getEngineStatus } from "@dots/game-engine";
import { APP_NAME, HealthResponseSchema } from "@dots/shared";
import { env } from "./env.js";
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
  });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: env.CORS_ORIGIN,
  },
  // Allow clients to recover after brief network blips.
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});

io.on("connection", (socket) => {
  registerSocketHandlers(io, socket);
});

httpServer.listen(env.PORT, () => {
  console.log(`[${APP_NAME}] Socket.IO multiplayer server listening on :${env.PORT}`);
});
