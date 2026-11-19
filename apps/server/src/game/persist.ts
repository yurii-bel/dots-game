import type { PlayerColor } from "@dots/game-engine";
import type { PrismaClient } from "@dots/database";
import { applyRankedGameResult } from "./ratings.js";

let persistenceEnabled: boolean | null = null;
let prisma: PrismaClient | null = null;

async function getPrisma(): Promise<PrismaClient | null> {
  if (!process.env.DATABASE_URL) return null;
  if (prisma) return prisma;
  try {
    const mod = await import("@dots/database");
    prisma = mod.prisma;
    return prisma;
  } catch (err) {
    console.warn("[persist] Failed to load @dots/database — in-memory games only", err);
    return null;
  }
}

async function canPersist(): Promise<boolean> {
  if (persistenceEnabled !== null) return persistenceEnabled;
  const client = await getPrisma();
  if (!client) {
    persistenceEnabled = false;
    return false;
  }
  try {
    await client.$queryRaw`SELECT 1`;
    persistenceEnabled = true;
    return true;
  } catch {
    console.warn("[persist] Database unavailable — in-memory games only");
    persistenceEnabled = false;
    return false;
  }
}

export async function persistGameCreated(input: {
  gameId: string;
  roomCode: string | null;
  /** Find-match = ranked; private rooms = false in v1. */
  ranked?: boolean;
  status: "waiting" | "in_progress";
  ruleset: string;
  rulesetVersion: string;
  players: Array<{
    playerId: string;
    userId?: string;
    color: PlayerColor;
    displayName?: string;
  }>;
}): Promise<void> {
  if (!(await canPersist()) || !prisma) return;
  try {
    await prisma.game.create({
      data: {
        id: input.gameId,
        roomCode: input.roomCode,
        ranked: input.ranked ?? false,
        status: input.status,
        ruleset: input.ruleset,
        rulesetVersion: input.rulesetVersion,
        players: {
          create: input.players.map((p) => ({
            playerId: p.playerId,
            userId: p.userId ?? null,
            color: p.color,
            displayName: p.displayName ?? null,
          })),
        },
      },
    });
  } catch (err) {
    console.warn("[persist] create game failed", err);
  }
}

export async function persistGameStarted(gameId: string): Promise<void> {
  if (!(await canPersist()) || !prisma) return;
  try {
    await prisma.game.update({
      where: { id: gameId },
      data: { status: "in_progress" },
    });
  } catch (err) {
    console.warn("[persist] start game failed", err);
  }
}

export async function persistPlayerJoined(input: {
  gameId: string;
  playerId: string;
  userId?: string;
  color: PlayerColor;
  displayName?: string;
}): Promise<void> {
  if (!(await canPersist()) || !prisma) return;
  try {
    await prisma.gamePlayer.create({
      data: {
        gameId: input.gameId,
        playerId: input.playerId,
        userId: input.userId ?? null,
        color: input.color,
        displayName: input.displayName ?? null,
      },
    });
    await prisma.game.update({
      where: { id: input.gameId },
      data: { status: "in_progress" },
    });
  } catch (err) {
    console.warn("[persist] join player failed", err);
  }
}

export async function persistMove(input: {
  gameId: string;
  moveNumber: number;
  playerId: string;
  x: number;
  y: number;
  requestId: string;
  version: number;
}): Promise<void> {
  if (!(await canPersist()) || !prisma) return;
  try {
    await prisma.$transaction([
      prisma.move.create({
        data: {
          gameId: input.gameId,
          moveNumber: input.moveNumber,
          playerId: input.playerId,
          x: input.x,
          y: input.y,
          requestId: input.requestId,
        },
      }),
      prisma.game.update({
        where: { id: input.gameId },
        data: { version: input.version },
      }),
    ]);
  } catch (err) {
    console.warn("[persist] move failed", err);
  }
}

export async function persistGameFinished(input: {
  gameId: string;
  winner: PlayerColor | null;
  reason: string;
  version: number;
  /** When true, apply Classical Elo (Find-match). */
  ranked?: boolean;
  blueUserId?: string;
  redUserId?: string;
}): Promise<void> {
  if (!(await canPersist()) || !prisma) return;
  try {
    await prisma.game.update({
      where: { id: input.gameId },
      data: {
        status: "finished",
        winnerColor: input.winner,
        finishedReason: input.reason,
        version: input.version,
      },
    });
  } catch (err) {
    console.warn("[persist] finish game failed", err);
    return;
  }

  try {
    const outcome = await applyRankedGameResult(prisma, {
      gameId: input.gameId,
      ranked: input.ranked ?? false,
      winner: input.winner,
      blueUserId: input.blueUserId ?? "",
      redUserId: input.redUserId ?? "",
    });
    if (outcome.kind === "applied") {
      console.info(
        "[persist] ranked Elo applied",
        input.gameId,
        `blue ${outcome.blue.before}→${outcome.blue.after}`,
        `red ${outcome.red.before}→${outcome.red.after}`,
        `trade=${outcome.tradeFactor}`,
      );
    }
  } catch (err) {
    console.warn("[persist] ranked Elo apply failed", err);
  }
}
