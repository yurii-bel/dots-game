import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@dots/database";
import {
  MeResponseSchema,
  classifyDbError,
  upsertUserByClerkId,
} from "@dots/shared";
import { toMeResponse } from "@/lib/me";

export const dynamic = "force-dynamic";

const DB_HINT =
  "Ensure Postgres is running (e.g. docker compose up postgres -d) and run `pnpm db:push`.";

/** Authenticated upsert-by-clerkId fallback (idempotent + concurrent-safe). */
export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const clerkUser = await currentUser();
    const email =
      clerkUser?.primaryEmailAddress?.emailAddress ??
      clerkUser?.emailAddresses?.[0]?.emailAddress ??
      null;

    const user = await upsertUserByClerkId(prisma, { clerkId, email });
    const body = MeResponseSchema.parse(toMeResponse(user));
    return Response.json(body);
  } catch (err) {
    const classified = classifyDbError(err);
    if (classified.kind === "unavailable") {
      console.error("[api/me] database unavailable:", classified.message);
      return Response.json(
        {
          error: "Database unavailable",
          code: "DATABASE_UNAVAILABLE",
          hint: DB_HINT,
        },
        { status: 503 },
      );
    }
    console.error("[api/me] failed:", classified.message);
    return Response.json(
      {
        error: "Failed to load account",
        code: "ACCOUNT_LOOKUP_FAILED",
        hint: DB_HINT,
      },
      { status: 500 },
    );
  }
}
