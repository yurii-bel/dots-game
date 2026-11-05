/**
 * Session gate so the same accepted move never plays SFX twice
 * (idempotent requestId replay, remounts, etc.).
 */
let activeGameId: string | null = null;
const playedMoveNumbers = new Set<number>();
const playedRequestIds = new Set<string>();

export function resetMoveSoundDedupe(): void {
  activeGameId = null;
  playedMoveNumbers.clear();
  playedRequestIds.clear();
}

/**
 * Returns true once per placement for a game. Call only from `game:move:accepted`.
 */
export function shouldPlayMoveSound(input: {
  gameId: string;
  moveNumber: number;
  requestId: string;
}): boolean {
  if (input.gameId !== activeGameId) {
    activeGameId = input.gameId;
    playedMoveNumbers.clear();
    playedRequestIds.clear();
  }

  if (
    playedMoveNumbers.has(input.moveNumber) ||
    playedRequestIds.has(input.requestId)
  ) {
    return false;
  }

  playedMoveNumbers.add(input.moveNumber);
  playedRequestIds.add(input.requestId);
  return true;
}
