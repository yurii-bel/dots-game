const ACTIVE_GAME_KEY = "dots.activeGame";

export type ActiveGameSession = {
  gameId: string;
  roomCode?: string;
};

/** Persist active private/matchmaking session (localStorage — Resume across tabs). */
export function saveActiveGame(session: ActiveGameSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify(session));
  // Drop legacy sessionStorage / anonymous player keys if present.
  window.sessionStorage.removeItem(ACTIVE_GAME_KEY);
  window.localStorage.removeItem("dots.playerId");
  window.localStorage.removeItem("dots.displayName");
}

export function loadActiveGame(): ActiveGameSession | null {
  if (typeof window === "undefined") return null;

  const fromLocal = readSession(window.localStorage.getItem(ACTIVE_GAME_KEY));
  if (fromLocal) return fromLocal;

  // One-time migrate from pre–Task 1 sessionStorage.
  const legacy = readSession(window.sessionStorage.getItem(ACTIVE_GAME_KEY));
  if (legacy) {
    window.localStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify(legacy));
    window.sessionStorage.removeItem(ACTIVE_GAME_KEY);
    return legacy;
  }

  return null;
}

export function clearActiveGame(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACTIVE_GAME_KEY);
  window.sessionStorage.removeItem(ACTIVE_GAME_KEY);
}

function readSession(raw: string | null): ActiveGameSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ActiveGameSession;
    if (!parsed?.gameId || typeof parsed.gameId !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}
