import { prisma } from "@dots/database";
import {
  LeaderboardResponseSchema,
  classifyDbError,
  listClassicalLeaderboard,
} from "@dots/shared";

export const dynamic = "force-dynamic";

const DB_HINT =
  "Ensure Postgres is running (e.g. docker compose up postgres -d) and run `pnpm db:push`.";

/** Public Classical leaderboard (≥5 ranked games; hide 365d inactive). */
export async function GET() {
  try {
    const entries = await listClassicalLeaderboard(prisma);
    const body = LeaderboardResponseSchema.parse({
      pool: "classical",
      entries,
    });
    return Response.json(body);
  } catch (err) {
    const classified = classifyDbError(err);
    if (classified.kind === "unavailable") {
      console.error("[api/leaderboard] database unavailable:", classified.message);
      return Response.json(
        {
          error: "Database unavailable",
          code: "DATABASE_UNAVAILABLE",
          hint: DB_HINT,
        },
        { status: 503 },
      );
    }
    console.error("[api/leaderboard] failed:", classified.message);
    return Response.json(
      {
        error: "Failed to load leaderboard",
        code: "LEADERBOARD_LOOKUP_FAILED",
        hint: DB_HINT,
      },
      { status: 500 },
    );
  }
}
