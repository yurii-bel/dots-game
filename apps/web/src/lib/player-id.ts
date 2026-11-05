const STORAGE_KEY = "dots.playerId";
const NAME_KEY = "dots.displayName";
const ACTIVE_GAME_KEY = "dots.activeGame";

function randomUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers / SSR-safe path.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Stable anonymous player id for this browser (localStorage). */
export function getOrCreatePlayerId(): string {
  if (typeof window === "undefined") return randomUuid();
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const id = randomUuid();
  window.localStorage.setItem(STORAGE_KEY, id);
  return id;
}

export function getDisplayName(): string {
  if (typeof window === "undefined") return "Player";
  return window.localStorage.getItem(NAME_KEY) ?? "Player";
}

export function setDisplayName(name: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NAME_KEY, name.trim().slice(0, 32) || "Player");
}

export type ActiveGameSession = {
  gameId: string;
  roomCode?: string;
};

/** Persist active private/matchmaking session (localStorage — Resume across tabs). */
export function saveActiveGame(session: ActiveGameSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify(session));
  // Drop legacy sessionStorage copy if present.
  window.sessionStorage.removeItem(ACTIVE_GAME_KEY);
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
