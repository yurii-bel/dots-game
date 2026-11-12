import { auth } from "@clerk/nextjs/server";
import { prisma } from "@dots/database";
import {
  MeResponseSchema,
  SetNicknameBodySchema,
  classifyDbError,
  setUserNickname,
  upsertUserByClerkId,
} from "@dots/shared";
import { toMeResponse } from "@/lib/me";

export const dynamic = "force-dynamic";

const DB_HINT =
  "Ensure Postgres is running (e.g. docker compose up postgres -d) and run `pnpm db:push`.";

/** Set or change nickname (authenticated; uniqueness on nicknameNormalized). */
export async function POST(request: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON", code: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = SetNicknameBodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid nickname", code: "INVALID_NICKNAME", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const user = await upsertUserByClerkId(prisma, { clerkId });
    const result = await setUserNickname(prisma, {
      userId: user.id,
      nickname: parsed.data.nickname,
    });

    if (!result.ok) {
      if (result.code === "NICKNAME_TAKEN") {
        return Response.json(
          { error: "Nickname already taken", code: "NICKNAME_TAKEN" },
          { status: 409 },
        );
      }
      if (result.code === "INVALID_NICKNAME") {
        return Response.json(
          { error: "Invalid nickname", code: "INVALID_NICKNAME" },
          { status: 400 },
        );
      }
      return Response.json({ error: "User not found", code: "NOT_FOUND" }, { status: 404 });
    }

    return Response.json(MeResponseSchema.parse(toMeResponse(result.user)));
  } catch (err) {
    const classified = classifyDbError(err);
    if (classified.kind === "unavailable") {
      console.error("[api/nickname] database unavailable:", classified.message);
      return Response.json(
        {
          error: "Database unavailable",
          code: "DATABASE_UNAVAILABLE",
          hint: DB_HINT,
        },
        { status: 503 },
      );
    }
    console.error("[api/nickname] failed:", classified.message);
    return Response.json(
      {
        error: "Failed to save nickname",
        code: "NICKNAME_SAVE_FAILED",
        hint: DB_HINT,
      },
      { status: 500 },
    );
  }
}
