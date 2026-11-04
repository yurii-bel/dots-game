"use client";

import { io, type Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

let socket: Socket | null = null;

/** Singleton Socket.IO client (browser only). */
export function getSocket(): Socket {
  if (typeof window === "undefined") {
    throw new Error("Socket is only available in the browser");
  }
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

export function getSocketUrl(): string {
  return SOCKET_URL;
}
