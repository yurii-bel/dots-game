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

/** Idempotent upsert by clerkId; retries once on unique race. */
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
    if (!existing) throw err;
    return existing;
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
