export type QueuedPlayer = {
  userId: string;
  nickname: string;
  /** Live socket id; null after disconnect until the user re-joins/refreshes. */
  socketId: string | null;
  enqueuedAt: number;
};

export type EnqueueResult =
  | { kind: "enqueued"; player: QueuedPlayer }
  | { kind: "already_queued"; player: QueuedPlayer }
  | {
      kind: "paired";
      blue: QueuedPlayer;
      red: QueuedPlayer;
    };

/**
 * Simple FIFO 1v1 matchmaking queue.
 * Pairing is first-come-first-served; no rating.
 * Identity is Prisma userId (never client-minted).
 *
 * One authenticated user ⇒ one queue seat. Disconnect does not drop the seat
 * (socketId cleared); explicit cancel or a successful pair removes it.
 */
export class MatchmakingQueue {
  private readonly queue: QueuedPlayer[] = [];

  enqueue(player: {
    userId: string;
    nickname: string;
    socketId: string;
  }): EnqueueResult {
    const existingIdx = this.queue.findIndex((p) => p.userId === player.userId);
    if (existingIdx !== -1) {
      const existing = this.queue[existingIdx]!;
      existing.socketId = player.socketId;
      existing.nickname = player.nickname;
      return { kind: "already_queued", player: existing };
    }

    const waiting = this.queue.shift();
    if (!waiting) {
      const entry: QueuedPlayer = {
        ...player,
        enqueuedAt: Date.now(),
      };
      this.queue.push(entry);
      return { kind: "enqueued", player: entry };
    }

    // Waiting player is blue (first), joiner is red.
    return {
      kind: "paired",
      blue: waiting,
      red: { ...player, enqueuedAt: Date.now() },
    };
  }

  remove(userId: string): boolean {
    const idx = this.queue.findIndex((p) => p.userId === userId);
    if (idx === -1) return false;
    this.queue.splice(idx, 1);
    return true;
  }

  /**
   * Restore a player to the front of the queue without pairing.
   * Used when match creation fails after a pair was already taken off the queue.
   */
  putBack(player: {
    userId: string;
    nickname: string;
    socketId: string | null;
  }): void {
    this.remove(player.userId);
    this.queue.unshift({
      userId: player.userId,
      nickname: player.nickname,
      socketId: player.socketId,
      enqueuedAt: Date.now(),
    });
  }

  has(userId: string): boolean {
    return this.queue.some((p) => p.userId === userId);
  }

  get(userId: string): QueuedPlayer | undefined {
    return this.queue.find((p) => p.userId === userId);
  }

  /**
   * Soft-disconnect: clear socket binding but keep the queue seat so a later
   * opponent can still pair, and so reconnect can refresh the same seat.
   */
  clearSocket(socketId: string): void {
    for (const entry of this.queue) {
      if (entry.socketId === socketId) {
        entry.socketId = null;
      }
    }
  }

  /** @deprecated Prefer clearSocket — kept for call-site clarity during transition. */
  removeBySocket(socketId: string): void {
    this.clearSocket(socketId);
  }

  size(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue.length = 0;
  }
}

export const matchmakingQueue = new MatchmakingQueue();
