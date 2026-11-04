import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { getEngineStatus } from "@dots/game-engine";
import { APP_NAME, HealthResponseSchema } from "@dots/shared";
import { env } from "./env";

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
  });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: env.CORS_ORIGIN,
  },
});

io.on("connection", (socket) => {
  // Scaffold only — no gameplay rooms or moves.
  socket.emit("server:hello", {
    message: `${APP_NAME} Socket.IO scaffold`,
    engine: getEngineStatus(),
  });

  socket.on("client:ping", () => {
    socket.emit("server:pong", { timestamp: new Date().toISOString() });
  });
});

httpServer.listen(env.PORT, () => {
  console.log(`[${APP_NAME}] Socket.IO server listening on :${env.PORT}`);
});
