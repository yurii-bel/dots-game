import Link from "next/link";
import { APP_NAME } from "@dots/shared";
import { RankingFaq } from "@/components/game/RankingFaq";

/** In-app Classical ranking FAQ — Match desk layout. */
export default function FaqPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-16 pt-16 sm:pt-20">
      <header className="flex animate-[match-desk-in_420ms_ease-out_both] flex-col items-center text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {APP_NAME}
        </p>
        <h1 className="mt-2 font-sans text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Rating FAQ
        </h1>
        <p className="mt-2 max-w-[20rem] text-sm leading-relaxed text-muted-foreground">
          How Classical Elo, titles, and the public board work.
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
          href="/leaderboard"
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Leaderboard
        </Link>
      </nav>

      <div
        className="mt-10 animate-[match-desk-in_420ms_ease-out_both]"
        style={{ animationDelay: "80ms" }}
      >
        <RankingFaq />
      </div>
    </main>
  );
}
