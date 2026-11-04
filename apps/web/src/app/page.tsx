import { APP_NAME, DEFAULT_BOARD_HEIGHT, DEFAULT_BOARD_WIDTH } from "@dots/shared";
import { getEngineStatus } from "@dots/game-engine";
import { Button } from "@/components/ui/button";
import { ScaffoldStatus } from "@/components/scaffold-status";

export default function HomePage() {
  const engine = getEngineStatus();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Milestone 1 · scaffold
        </p>
        <h1 className="text-5xl font-semibold tracking-tight text-foreground">{APP_NAME}</h1>
        <p className="text-lg text-muted-foreground">
          Спортивные точки online — monorepo scaffold only. No board, capture, or multiplayer
          gameplay yet.
        </p>
      </div>

      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          Planned classic board reference: {DEFAULT_BOARD_WIDTH} × {DEFAULT_BOARD_HEIGHT} (not
          rendered).
        </p>
        <p>
          Engine: {engine.version} — {engine.message}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled>
          Play (coming later)
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href="http://localhost:4000/health" target="_blank" rel="noreferrer">
            Server health
          </a>
        </Button>
      </div>

      <ScaffoldStatus />
    </main>
  );
}
