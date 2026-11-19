const ACTIVE_GAME_KEY = "dots.activeGame";
const ACTIVE_GAME_USER_PREFIX = "dots.activeGame.user.";

export type ActiveGameSession = {
  gameId: string;
  roomCode?: string;
};

function userKey(userId: string): string {
  return `${ACTIVE_GAME_USER_PREFIX}${userId}`;
}

/** Persist active private/matchmaking session (localStorage — Resume across tabs). */
export function saveActiveGame(
  session: ActiveGameSession,
  userId?: string | null,
): void {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(session);
  if (userId) {
    window.localStorage.setItem(userKey(userId), raw);
  }
  // Legacy unscoped key — kept in sync for older tabs mid-upgrade.
  window.localStorage.setItem(ACTIVE_GAME_KEY, raw);
  // Drop legacy sessionStorage / anonymous player keys if present.
  window.sessionStorage.removeItem(ACTIVE_GAME_KEY);
  window.localStorage.removeItem("dots.playerId");
  window.localStorage.removeItem("dots.displayName");
}

export function loadActiveGame(userId?: string | null): ActiveGameSession | null {
  if (typeof window === "undefined") return null;

  if (userId) {
    const scoped = readSession(window.localStorage.getItem(userKey(userId)));
    if (scoped) return scoped;
  }

  const fromLocal = readSession(window.localStorage.getItem(ACTIVE_GAME_KEY));
  if (fromLocal) {
    // Migrate legacy unscoped session into the signed-in user's bucket.
    if (userId) {
      window.localStorage.setItem(userKey(userId), JSON.stringify(fromLocal));
    }
    return fromLocal;
  }

  // One-time migrate from pre–Task 1 sessionStorage.
  const legacy = readSession(window.sessionStorage.getItem(ACTIVE_GAME_KEY));
  if (legacy) {
    window.localStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify(legacy));
    if (userId) {
      window.localStorage.setItem(userKey(userId), JSON.stringify(legacy));
    }
    window.sessionStorage.removeItem(ACTIVE_GAME_KEY);
    return legacy;
  }

  return null;
}

export function clearActiveGame(userId?: string | null): void {
  if (typeof window === "undefined") return;
  if (userId) {
    window.localStorage.removeItem(userKey(userId));
  }
  window.localStorage.removeItem(ACTIVE_GAME_KEY);
  window.sessionStorage.removeItem(ACTIVE_GAME_KEY);
}

/**
 * Drop another account's unscoped legacy session when the signed-in user changes
 * so account B does not resume account A's gameId.
 */
export function clearForeignActiveGame(userId: string): void {
  if (typeof window === "undefined") return;
  const scoped = readSession(window.localStorage.getItem(userKey(userId)));
  const legacy = readSession(window.localStorage.getItem(ACTIVE_GAME_KEY));
  if (legacy && (!scoped || scoped.gameId !== legacy.gameId)) {
    // Legacy key belongs to a different account — wipe it.
    window.localStorage.removeItem(ACTIVE_GAME_KEY);
  }
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
