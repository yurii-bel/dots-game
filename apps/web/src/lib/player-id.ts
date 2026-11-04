const STORAGE_KEY = "dots.playerId";
const NAME_KEY = "dots.displayName";

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

const SESSION_GAME_KEY = "dots.activeGame";

export type ActiveGameSession = {
  gameId: string;
  roomCode?: string;
};

export function saveActiveGame(session: ActiveGameSession): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SESSION_GAME_KEY, JSON.stringify(session));
}

export function loadActiveGame(): ActiveGameSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(SESSION_GAME_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActiveGameSession;
  } catch {
    return null;
  }
}

export function clearActiveGame(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SESSION_GAME_KEY);
}
