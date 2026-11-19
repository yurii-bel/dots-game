import { describe, expect, it, beforeEach } from "vitest";
import { MatchmakingQueue } from "./queue.js";

describe("MatchmakingQueue", () => {
  let queue: MatchmakingQueue;

  beforeEach(() => {
    queue = new MatchmakingQueue();
  });

  it("enqueues the first authenticated user alone", () => {
    const result = queue.enqueue({
      userId: "user_a",
      nickname: "Alice",
      socketId: "sock_a",
    });
    expect(result.kind).toBe("enqueued");
    expect(queue.size()).toBe(1);
    expect(queue.has("user_a")).toBe(true);
  });

  it("pairs a second distinct user with the first and empties the queue", () => {
    queue.enqueue({
      userId: "user_a",
      nickname: "Alice",
      socketId: "sock_a",
    });
    const result = queue.enqueue({
      userId: "user_b",
      nickname: "Bob",
      socketId: "sock_b",
    });

    expect(result.kind).toBe("paired");
    if (result.kind !== "paired") return;
    expect(result.blue.userId).toBe("user_a");
    expect(result.blue.socketId).toBe("sock_a");
    expect(result.red.userId).toBe("user_b");
    expect(result.red.socketId).toBe("sock_b");
    expect(queue.size()).toBe(0);
  });

  it("keeps one seat per userId and refreshes socket on re-join", () => {
    queue.enqueue({
      userId: "user_a",
      nickname: "Alice",
      socketId: "sock_a1",
    });
    const again = queue.enqueue({
      userId: "user_a",
      nickname: "Alice",
      socketId: "sock_a2",
    });

    expect(again.kind).toBe("already_queued");
    if (again.kind !== "already_queued") return;
    expect(again.player.socketId).toBe("sock_a2");
    expect(queue.size()).toBe(1);

    // Must not self-pair: a third distinct user still pairs with Alice.
    const paired = queue.enqueue({
      userId: "user_b",
      nickname: "Bob",
      socketId: "sock_b",
    });
    expect(paired.kind).toBe("paired");
    if (paired.kind !== "paired") return;
    expect(paired.blue.userId).toBe("user_a");
    expect(paired.blue.socketId).toBe("sock_a2");
    expect(paired.red.userId).toBe("user_b");
  });

  it("does not drop a waiting seat on disconnect — opponent can still pair", () => {
    queue.enqueue({
      userId: "user_a",
      nickname: "Alice",
      socketId: "sock_a",
    });
    queue.clearSocket("sock_a");

    expect(queue.has("user_a")).toBe(true);
    expect(queue.get("user_a")?.socketId).toBeNull();

    const paired = queue.enqueue({
      userId: "user_b",
      nickname: "Bob",
      socketId: "sock_b",
    });
    expect(paired.kind).toBe("paired");
    if (paired.kind !== "paired") return;
    expect(paired.blue.userId).toBe("user_a");
    expect(paired.blue.socketId).toBeNull();
    expect(paired.red.userId).toBe("user_b");
    expect(queue.size()).toBe(0);
  });

  it("does not clear another user's seat when a different socket disconnects", () => {
    queue.enqueue({
      userId: "user_a",
      nickname: "Alice",
      socketId: "sock_a",
    });
    queue.clearSocket("sock_other");
    expect(queue.get("user_a")?.socketId).toBe("sock_a");
    expect(queue.size()).toBe(1);
  });

  it("explicit remove cancels only that userId", () => {
    queue.enqueue({
      userId: "user_a",
      nickname: "Alice",
      socketId: "sock_a",
    });
    // Force a second waiter by using a fresh queue path: cancel is the only
    // way to have multiple waiters if pairing is deferred — here we only need
    // one waiter and confirm remove is user-scoped.
    expect(queue.remove("user_b")).toBe(false);
    expect(queue.remove("user_a")).toBe(true);
    expect(queue.size()).toBe(0);
  });

  it("FIFO: later joiner pairs with the oldest waiter", () => {
    queue.enqueue({
      userId: "user_a",
      nickname: "Alice",
      socketId: "sock_a",
    });
    const paired = queue.enqueue({
      userId: "user_c",
      nickname: "Carol",
      socketId: "sock_c",
    });
    expect(paired.kind).toBe("paired");
    if (paired.kind !== "paired") return;
    expect(paired.blue.userId).toBe("user_a");
    expect(paired.red.userId).toBe("user_c");
  });

  it("putBack restores both players without pairing them together", () => {
    queue.putBack({
      userId: "user_a",
      nickname: "Alice",
      socketId: "sock_a",
    });
    queue.putBack({
      userId: "user_b",
      nickname: "Bob",
      socketId: "sock_b",
    });
    expect(queue.size()).toBe(2);
    expect(queue.has("user_a")).toBe(true);
    expect(queue.has("user_b")).toBe(true);

    const paired = queue.enqueue({
      userId: "user_c",
      nickname: "Carol",
      socketId: "sock_c",
    });
    expect(paired.kind).toBe("paired");
    if (paired.kind !== "paired") return;
    // Front of queue after two putBacks is user_b (last putBack unshifted).
    expect(paired.blue.userId).toBe("user_b");
    expect(paired.red.userId).toBe("user_c");
    expect(queue.has("user_a")).toBe(true);
  });
});
