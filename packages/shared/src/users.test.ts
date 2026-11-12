import { describe, expect, it, vi } from "vitest";
import {
  classifyDbError,
  setUserNickname,
  upsertUserByClerkId,
  type UserRecord,
} from "./users";

function fakeUser(partial: Partial<UserRecord> & Pick<UserRecord, "id" | "clerkId">): UserRecord {
  const now = new Date();
  return {
    email: null,
    nickname: null,
    nicknameNormalized: null,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

describe("upsertUserByClerkId", () => {
  it("returns upsert result", async () => {
    const user = fakeUser({ id: "u1", clerkId: "clerk_1" });
    const db = {
      user: {
        upsert: vi.fn().mockResolvedValue(user),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };
    const result = await upsertUserByClerkId(db, { clerkId: "clerk_1", email: "a@b.co" });
    expect(result.id).toBe("u1");
    expect(db.user.upsert).toHaveBeenCalledOnce();
  });

  it("retries findUnique on unique race", async () => {
    const user = fakeUser({ id: "u1", clerkId: "clerk_1", email: "a@b.co" });
    const db = {
      user: {
        upsert: vi.fn().mockRejectedValue({ code: "P2002" }),
        findUnique: vi.fn().mockResolvedValue(user),
        update: vi.fn(),
      },
    };
    const result = await upsertUserByClerkId(db, { clerkId: "clerk_1" });
    expect(result).toEqual(user);
    expect(db.user.findUnique).toHaveBeenCalledOnce();
  });

  it("retries create without email when email unique conflicts", async () => {
    const user = fakeUser({ id: "u2", clerkId: "clerk_2", email: null });
    const db = {
      user: {
        upsert: vi
          .fn()
          .mockRejectedValueOnce({ code: "P2002" })
          .mockResolvedValueOnce(user),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    };
    const result = await upsertUserByClerkId(db, {
      clerkId: "clerk_2",
      email: "taken@example.com",
    });
    expect(result).toEqual(user);
    expect(db.user.upsert).toHaveBeenCalledTimes(2);
    expect(db.user.upsert).toHaveBeenLastCalledWith({
      where: { clerkId: "clerk_2" },
      create: { clerkId: "clerk_2", email: null },
      update: {},
    });
  });
});

describe("classifyDbError", () => {
  it("marks connection failures as unavailable", () => {
    expect(classifyDbError({ code: "P1001", message: "unreachable" }).kind).toBe(
      "unavailable",
    );
    expect(
      classifyDbError(new Error("Can't reach database server at localhost")).kind,
    ).toBe("unavailable");
  });

  it("marks other errors as unknown", () => {
    expect(classifyDbError(new Error("boom")).kind).toBe("unknown");
  });
});

describe("setUserNickname", () => {
  it("rejects invalid nicknames", async () => {
    const db = {
      user: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };
    const result = await setUserNickname(db, { userId: "u1", nickname: "ab" });
    expect(result).toEqual({ ok: false, code: "INVALID_NICKNAME" });
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("maps unique violation to NICKNAME_TAKEN", async () => {
    const db = {
      user: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn().mockRejectedValue({ code: "P2002" }),
      },
    };
    const result = await setUserNickname(db, { userId: "u1", nickname: "Taken" });
    expect(result).toEqual({ ok: false, code: "NICKNAME_TAKEN" });
  });

  it("stores normalized nickname", async () => {
    const user = fakeUser({
      id: "u1",
      clerkId: "c1",
      nickname: "Alice",
      nicknameNormalized: "alice",
    });
    const db = {
      user: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue(user),
      },
    };
    const result = await setUserNickname(db, { userId: "u1", nickname: "Alice" });
    expect(result.ok).toBe(true);
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { nickname: "Alice", nicknameNormalized: "alice" },
    });
  });
});
