type QueuedPlayer = {
  userId: string;
  nickname: string;
  socketId: string;
  enqueuedAt: number;
};

/**
 * Simple FIFO 1v1 matchmaking queue.
 * Pairing is first-come-first-served; no rating.
 * Identity is Prisma userId (never client-minted).
 */
export class MatchmakingQueue {
  private readonly queue: QueuedPlayer[] = [];

  enqueue(player: Omit<QueuedPlayer, "enqueuedAt">): { paired: false } | {
    paired: true;
    blue: QueuedPlayer;
    red: QueuedPlayer;
  } {
    this.remove(player.userId);

    const waiting = this.queue.shift();
    if (!waiting) {
      this.queue.push({ ...player, enqueuedAt: Date.now() });
      return { paired: false };
    }

    // Waiting player is blue (first), joiner is red.
    return {
      paired: true,
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

  has(userId: string): boolean {
    return this.queue.some((p) => p.userId === userId);
  }

  /** Drop queue entries bound to a disconnected socket. */
  removeBySocket(socketId: string): void {
    for (let i = this.queue.length - 1; i >= 0; i -= 1) {
      if (this.queue[i]?.socketId === socketId) {
        this.queue.splice(i, 1);
      }
    }
  }

  clear(): void {
    this.queue.length = 0;
  }
}

export const matchmakingQueue = new MatchmakingQueue();
