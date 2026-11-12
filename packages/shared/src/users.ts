/**
 * Concurrent-safe Clerk → Prisma user upsert helpers (pure decision helpers + error codes).
 * Call sites pass a Prisma-like client; no DB dependency in @dots/shared.
 */

import { normalizeNickname, NicknameSchema } from "./nickname";

export type UserRecord = {
  id: string;
  clerkId: string;
  email: string | null;
  nickname: string | null;
  nicknameNormalized: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UserUpsertClient = {
  user: {
    upsert: (args: {
      where: { clerkId: string };
      create: { clerkId: string; email?: string | null };
      update: { email?: string | null };
    }) => Promise<UserRecord>;
    findUnique: (args: {
      where: { clerkId: string } | { id: string };
    }) => Promise<UserRecord | null>;
    update: (args: {
      where: { id: string };
      data: { nickname: string; nicknameNormalized: string };
    }) => Promise<UserRecord>;
  };
};

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === "P2002"
  );
}

/**
 * Classify Prisma / connection failures so API routes can return clear JSON
 * instead of an unhandled 500 that blanks the signed-in UI.
 */
export function classifyDbError(err: unknown): {
  kind: "unavailable" | "unknown";
  message: string;
} {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  const message = err instanceof Error ? err.message : String(err);
  const unavailableCodes = new Set([
    "P1000",
    "P1001",
    "P1002",
    "P1003",
    "P1017",
    "P2021",
    "P2024",
  ]);
  if (unavailableCodes.has(code)) {
    return { kind: "unavailable", message };
  }
  if (
    /can't reach database|ECONNREFUSED|connection.*(refused|timed out)|Environment variable not found:\s*DATABASE_URL|does not exist in the current database|Timed out fetching a new connection/i.test(
      message,
    )
  ) {
    return { kind: "unavailable", message };
  }
  return { kind: "unknown", message };
}

/** Idempotent upsert by clerkId; recovers from clerkId/email unique races. */
export async function upsertUserByClerkId(
  db: UserUpsertClient,
  input: { clerkId: string; email?: string | null },
): Promise<UserRecord> {
  try {
    return await db.user.upsert({
      where: { clerkId: input.clerkId },
      create: {
        clerkId: input.clerkId,
        email: input.email ?? null,
      },
      // Touch email when provided; otherwise no-op update keeps upsert valid.
      update:
        input.email !== undefined
          ? { email: input.email }
          : { email: undefined },
    });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;

    const existing = await db.user.findUnique({
      where: { clerkId: input.clerkId },
    });
    if (existing) return existing;

    // Email unique conflict on create (another row owns this email) — create without email.
    if (input.email) {
      try {
        return await db.user.upsert({
          where: { clerkId: input.clerkId },
          create: { clerkId: input.clerkId, email: null },
          update: {},
        });
      } catch (retryErr) {
        if (!isUniqueViolation(retryErr)) throw retryErr;
        const again = await db.user.findUnique({
          where: { clerkId: input.clerkId },
        });
        if (again) return again;
        throw retryErr;
      }
    }

    throw err;
  }
}

export type SetNicknameResult =
  | { ok: true; user: UserRecord }
  | { ok: false; code: "INVALID_NICKNAME" | "NICKNAME_TAKEN" | "NOT_FOUND" };

/** Set / change nickname with normalize + unique conflict handling. */
export async function setUserNickname(
  db: UserUpsertClient,
  input: { userId: string; nickname: string },
): Promise<SetNicknameResult> {
  const parsed = NicknameSchema.safeParse(input.nickname);
  if (!parsed.success) {
    return { ok: false, code: "INVALID_NICKNAME" };
  }
  const nickname = parsed.data;
  const nicknameNormalized = normalizeNickname(nickname);

  try {
    const user = await db.user.update({
      where: { id: input.userId },
      data: { nickname, nicknameNormalized },
    });
    return { ok: true, user };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, code: "NICKNAME_TAKEN" };
    }
    // Prisma P2025 record not found
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: unknown }).code === "P2025"
    ) {
      return { ok: false, code: "NOT_FOUND" };
    }
    throw err;
  }
}
