"use client";

import { io, type Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

let socket: Socket | null = null;
let tokenProvider: (() => Promise<string | null>) | null = null;

/** Register Clerk getToken for Socket.IO handshake auth. */
export function setSocketTokenProvider(
  provider: (() => Promise<string | null>) | null,
): void {
  tokenProvider = provider;
}

/**
 * Singleton Socket.IO client (browser only).
 * Auth: Clerk JWT only — no client identity claims.
 */
export function getSocket(): Socket {
  if (typeof window === "undefined") {
    throw new Error("Socket is only available in the browser");
  }
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      auth: (cb) => {
        void (async () => {
          const token = tokenProvider ? await tokenProvider() : null;
          cb(token ? { token } : {});
        })();
      },
    });
  }
  return socket;
}

/** Disconnect and drop singleton so the next connect picks up a fresh token provider. */
export function resetSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function getSocketUrl(): string {
  return SOCKET_URL;
}
