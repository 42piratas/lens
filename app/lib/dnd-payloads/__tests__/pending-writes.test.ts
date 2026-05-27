import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BACKOFF_MS,
  QUEUE_STORAGE_KEY,
  _resetPendingWritesForTest,
  clearFailureForCard,
  enqueueWrite,
  getFailureForCard,
  getFailures,
  isPermanentReason,
  readQueue,
  retryFailureForCard,
  startPendingWriteWorker,
  stopPendingWriteWorker,
  subscribeToFailures,
  type Executor,
  type ExecutorResult,
} from "../pending-writes";

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) {
    return this.store.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.store.set(k, v);
  }
  removeItem(k: string) {
    this.store.delete(k);
  }
  clear() {
    this.store.clear();
  }
  key(i: number) {
    return Array.from(this.store.keys())[i] ?? null;
  }
  get length() {
    return this.store.size;
  }
}

let storage: MemoryStorage;

const installWindow = () => {
  storage = new MemoryStorage();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: storage },
  });
};

const uninstallWindow = () => {
  delete (globalThis as { window?: unknown }).window;
};

const mkPayload = (name = "OKR1") =>
  ({ kind: "tag-like" as const, name }) as const;

describe("pending-writes — classification", () => {
  it("treats 401/403/auth strings as permanent", () => {
    expect(isPermanentReason("Trello API 401")).toBe(true);
    expect(isPermanentReason("403 forbidden")).toBe(true);
    expect(isPermanentReason("auth-expired")).toBe(true);
    expect(isPermanentReason("unauthorized")).toBe(true);
  });

  it("treats network/rate-limit as transient", () => {
    expect(isPermanentReason("network error")).toBe(false);
    expect(isPermanentReason("rate-limit")).toBe(false);
    expect(isPermanentReason("Trello API 500")).toBe(false);
  });
});

describe("pending-writes — queue persistence", () => {
  beforeEach(() => {
    installWindow();
    _resetPendingWritesForTest();
  });
  afterEach(() => {
    _resetPendingWritesForTest();
    uninstallWindow();
  });

  it("persists enqueued writes to localStorage", () => {
    enqueueWrite({ kind: "accept", cardId: "card-1", payload: mkPayload() });
    expect(storage.getItem(QUEUE_STORAGE_KEY)).not.toBeNull();
    const queue = readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]!.cardId).toBe("card-1");
    expect(queue[0]!.attempt).toBe(0);
  });

  it("survives a simulated reload (readQueue reads from storage)", () => {
    enqueueWrite({ kind: "accept", cardId: "card-1", payload: mkPayload() });
    enqueueWrite({ kind: "clip-edit", cardId: "card-2", payload: mkPayload("OKR2") });
    const queue = readQueue();
    expect(queue).toHaveLength(2);
    expect(queue.map((w) => w.kind).sort()).toEqual(["accept", "clip-edit"]);
  });

  it("ignores malformed persisted state", () => {
    storage.setItem(QUEUE_STORAGE_KEY, "{not-json");
    expect(readQueue()).toEqual([]);
  });

  it("ignores entries with missing fields", () => {
    storage.setItem(QUEUE_STORAGE_KEY, JSON.stringify([{ id: "x" }]));
    expect(readQueue()).toEqual([]);
  });
});

describe("pending-writes — worker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    installWindow();
    _resetPendingWritesForTest();
  });
  afterEach(() => {
    stopPendingWriteWorker();
    _resetPendingWritesForTest();
    vi.useRealTimers();
    uninstallWindow();
  });

  it("drains the queue on success", async () => {
    const exec: Executor = vi.fn(
      async (): Promise<ExecutorResult> => ({ ok: true }),
    );
    enqueueWrite({ kind: "accept", cardId: "card-1", payload: mkPayload() });
    startPendingWriteWorker(exec);
    await vi.advanceTimersByTimeAsync(0);
    expect(exec).toHaveBeenCalledTimes(1);
    expect(readQueue()).toHaveLength(0);
  });

  it("backs off transient failures by 1s → 5s → 30s → 5m", async () => {
    let calls = 0;
    const exec: Executor = vi.fn(async () => {
      calls++;
      return { ok: false, reason: "network" };
    });
    enqueueWrite({ kind: "accept", cardId: "card-1", payload: mkPayload() });
    startPendingWriteWorker(exec);

    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toBe(1);
    expect(readQueue()[0]!.attempt).toBe(1);

    await vi.advanceTimersByTimeAsync(BACKOFF_MS[0]);
    expect(calls).toBe(2);
    expect(readQueue()[0]!.attempt).toBe(2);

    await vi.advanceTimersByTimeAsync(BACKOFF_MS[1]);
    expect(calls).toBe(3);

    await vi.advanceTimersByTimeAsync(BACKOFF_MS[2]);
    expect(calls).toBe(4);

    await vi.advanceTimersByTimeAsync(BACKOFF_MS[3]);
    expect(calls).toBe(5);
  });

  it("permanent failure removes from queue + registers a failure pill", async () => {
    const failureSpy = vi.fn();
    const unsub = subscribeToFailures(failureSpy);
    const exec: Executor = vi.fn(async () => ({ ok: false, reason: "Trello API 401" }));

    enqueueWrite({ kind: "accept", cardId: "card-1", payload: mkPayload() });
    startPendingWriteWorker(exec);
    await vi.advanceTimersByTimeAsync(0);

    expect(readQueue()).toHaveLength(0);
    const failure = getFailureForCard("card-1");
    expect(failure).toBeDefined();
    expect(failure?.reason).toContain("401");
    expect(failureSpy).toHaveBeenCalled();
    unsub();
  });

  it("ok-result clears any prior permanent failure for the same card", async () => {
    let firstCall = true;
    const exec: Executor = vi.fn(async (): Promise<ExecutorResult> => {
      if (firstCall) {
        firstCall = false;
        return { ok: false, reason: "Trello API 401" };
      }
      return { ok: true };
    });
    enqueueWrite({ kind: "accept", cardId: "card-1", payload: mkPayload() });
    startPendingWriteWorker(exec);
    await vi.advanceTimersByTimeAsync(0);
    expect(getFailureForCard("card-1")).toBeDefined();

    enqueueWrite({ kind: "accept", cardId: "card-1", payload: mkPayload() });
    await vi.advanceTimersByTimeAsync(0);
    expect(getFailureForCard("card-1")).toBeUndefined();
  });

  it("retryFailureForCard re-enqueues + clears the pill", async () => {
    let calls = 0;
    const exec: Executor = vi.fn(async (): Promise<ExecutorResult> => {
      calls++;
      return calls === 1 ? { ok: false, reason: "Trello API 401" } : { ok: true };
    });
    enqueueWrite({ kind: "accept", cardId: "card-1", payload: mkPayload() });
    startPendingWriteWorker(exec);
    await vi.advanceTimersByTimeAsync(0);
    expect(getFailureForCard("card-1")).toBeDefined();
    expect(readQueue()).toHaveLength(0);

    retryFailureForCard("card-1");
    expect(readQueue()).toHaveLength(1);
    expect(getFailureForCard("card-1")).toBeUndefined();
    await vi.advanceTimersByTimeAsync(0);
    expect(readQueue()).toHaveLength(0);
  });

  it("handles thrown executor errors as transient", async () => {
    let calls = 0;
    const exec: Executor = vi.fn(async (): Promise<ExecutorResult> => {
      calls++;
      if (calls === 1) throw new Error("boom");
      return { ok: true };
    });
    enqueueWrite({ kind: "accept", cardId: "card-1", payload: mkPayload() });
    startPendingWriteWorker(exec);
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toBe(1);
    expect(readQueue()).toHaveLength(1);
    expect(readQueue()[0]!.lastError).toContain("boom");

    await vi.advanceTimersByTimeAsync(BACKOFF_MS[0]);
    expect(calls).toBe(2);
    expect(readQueue()).toHaveLength(0);
  });

  it("getFailures + clearFailureForCard interact correctly", async () => {
    const exec: Executor = vi.fn(async () => ({ ok: false, reason: "401" }));
    enqueueWrite({ kind: "accept", cardId: "card-A", payload: mkPayload("a") });
    enqueueWrite({ kind: "accept", cardId: "card-B", payload: mkPayload("b") });
    startPendingWriteWorker(exec);
    // Drain both pending writes — fake timers schedule sequentially via
    // scheduleNext; runAllTimersAsync replays them until quiescence.
    await vi.runAllTimersAsync();
    expect(getFailures().map((f) => f.cardId).sort()).toEqual(["card-A", "card-B"]);
    clearFailureForCard("card-A");
    expect(getFailures().map((f) => f.cardId)).toEqual(["card-B"]);
  });
});
