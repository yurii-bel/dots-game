import Link from "next/link";
import { prisma } from "@dots/database";
import {
  APP_NAME,
  PLACEMENT_GAMES,
  classifyDbError,
  listClassicalLeaderboard,
  type LeaderboardEntry,
} from "@dots/shared";
import { ClassicalTitleBadge } from "@/components/game/ClassicalTitleBadge";

export const dynamic = "force-dynamic";

async function loadEntries(): Promise<{
  entries: LeaderboardEntry[];
  error: string | null;
}> {
  try {
    const entries = await listClassicalLeaderboard(prisma);
    return { entries, error: null };
  } catch (err) {
    const classified = classifyDbError(err);
    console.error("[leaderboard] failed:", classified.message);
    return {
      entries: [],
      error:
        classified.kind === "unavailable"
          ? "Leaderboard unavailable — database is offline."
          : "Could not load the Classical leaderboard.",
    };
  }
}

/** Public Classical leaderboard — Match desk layout. */
export default async function LeaderboardPage() {
  const { entries, error } = await loadEntries();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-16 pt-16 sm:pt-20">
      <header className="flex animate-[match-desk-in_420ms_ease-out_both] flex-col items-center text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {APP_NAME}
        </p>
        <h1 className="mt-2 font-sans text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Classical
        </h1>
        <p className="mt-2 max-w-[20rem] text-sm leading-relaxed text-muted-foreground">
          Public board after {PLACEMENT_GAMES} ranked games. Hidden after 365
          days without a ranked game.
        </p>
      </header>

      <nav
        className="mt-6 flex animate-[match-desk-in_420ms_ease-out_both] justify-center gap-4 text-sm"
        style={{ animationDelay: "40ms" }}
      >
        <Link
          href="/lobby"
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Lobby
        </Link>
        <Link
          href="/faq"
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Rating FAQ
        </Link>
      </nav>

      <section
        className="mt-8 animate-[match-desk-in_420ms_ease-out_both]"
        style={{ animationDelay: "80ms" }}
        aria-label="Classical leaderboard"
      >
        {error ? (
          <p className="text-center text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : entries.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            No players on the board yet. Play {PLACEMENT_GAMES} ranked Find-match
            games to appear.
          </p>
        ) : (
          <ol className="divide-y divide-border/70 border-y border-border/70">
            {entries.map((entry) => (
              <li
                key={`${entry.rank}-${entry.nickname}`}
                className="flex items-center gap-3 py-3"
              >
                <span className="w-7 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                  {entry.rank}
                </span>
                <ClassicalTitleBadge title={entry.title} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {entry.nickname}
                </span>
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                  {entry.rating}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
