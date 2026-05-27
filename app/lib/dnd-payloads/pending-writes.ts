/**
 * Optimistic-write retry queue for payload-adapter invocations.
 *
 * Adapters route their `onAccept` / `onSourceRemoved` calls through
 * `enqueueWrite(...)` — the UI returns immediately and the worker drains
 * the queue with exponential backoff. The queue persists to localStorage
 * so it survives reloads. Permanent (auth) failures register an inline
 * reconnect pill keyed by cardId; the renderer reads the failures via
 * `subscribeToFailures(...)` (or the `useFailureForCard` hook).
 */
import type { DragPayload } from "./types";

export const QUEUE_STORAGE_KEY = "lens.payload_pending_write";
export const BACKOFF_MS = [1_000, 5_000, 30_000, 300_000] as const;

export type PendingKind = "accept" | "clip-edit";

export type PendingWrite = {
  id: string;
  kind: PendingKind;
  cardId: string;
  payload: DragPayload;
  /** Optional per-row target — Trello card id, Calendar event id, etc. */
  target?: { id: string; meta?: Record<string, string> };
  attempt: number;
  nextAt: number;
  lastError?: string;
};

export type ExecutorResult =
  | { ok: true }
  | { ok: false; reason: string };

export type Executor = (pending: PendingWrite) => Promise<ExecutorResult>;

/** Permanent-failure sentinel — drives the inline reconnect pill. */
export type PermanentFailure = {
  cardId: string;
  reason: string;
  payload: DragPayload;
  target?: { id: string; meta?: Record<string, string> };
};

const failures = new Map<string, PermanentFailure>();
const failureListeners = new Set<() => void>();

function notifyFailures(): void {
  for (const l of failureListeners) l();
}

export function getFailures(): PermanentFailure[] {
  return [...failures.values()];
}

export function getFailureForCard(cardId: string): PermanentFailure | undefined {
  return failures.get(cardId);
}

export function subscribeToFailures(cb: () => void): () => void {
  failureListeners.add(cb);
  return () => failureListeners.delete(cb);
}

export function clearFailureForCard(cardId: string): void {
  if (failures.delete(cardId)) notifyFailures();
}

const safeGetItem = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSetItem = (key: string, value: string): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage full / disabled — drop silently */
  }
};

export function readQueue(): PendingWrite[] {
  const raw = safeGetItem(QUEUE_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (w): w is PendingWrite =>
        w &&
        typeof w === "object" &&
        typeof w.id === "string" &&
        (w.kind === "accept" || w.kind === "clip-edit") &&
        typeof w.cardId === "string" &&
        typeof w.payload === "object" &&
        typeof w.attempt === "number" &&
        typeof w.nextAt === "number",
    );
  } catch {
    return [];
  }
}

export function writeQueue(queue: PendingWrite[]): void {
  safeSetItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `pw_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;

export type EnqueueInput = {
  kind: PendingKind;
  cardId: string;
  payload: DragPayload;
  target?: { id: string; meta?: Record<string, string> };
};

/**
 * Append a write to the queue. Returns the queued entry. The worker (if
 * running) will pick it up on its next tick.
 */
export function enqueueWrite(input: EnqueueInput): PendingWrite {
  const entry: PendingWrite = {
    id: newId(),
    kind: input.kind,
    cardId: input.cardId,
    payload: input.payload,
    target: input.target,
    attempt: 0,
    nextAt: Date.now(),
  };
  const queue = readQueue();
  queue.push(entry);
  writeQueue(queue);
  scheduleNext();
  return entry;
}

const PERMANENT_RE = /(401|403|auth|unauthor|forbidden)/i;

/** Classify a failure reason — auth/perm errors trigger the reconnect pill. */
export function isPermanentReason(reason: string): boolean {
  return PERMANENT_RE.test(reason);
}

let executor: Executor | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;

function clearTimer(): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}

function scheduleNext(): void {
  clearTimer();
  if (!executor) return;
  const queue = readQueue();
  if (queue.length === 0) return;
  const next = queue.reduce<PendingWrite>(
    (acc, w) => (w.nextAt < acc.nextAt ? w : acc),
    queue[0]!,
  );
  const wait = Math.max(0, next.nextAt - Date.now());
  timer = setTimeout(() => {
    void tick();
  }, wait);
}

async function tick(): Promise<void> {
  if (running || !executor) return;
  running = true;
  try {
    const queue = readQueue();
    const now = Date.now();
    const due = queue.find((w) => w.nextAt <= now);
    if (!due) return;

    let result: ExecutorResult;
    try {
      result = await executor(due);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result = { ok: false, reason: msg };
    }

    const fresh = readQueue();
    if (result.ok) {
      writeQueue(fresh.filter((w) => w.id !== due.id));
      // Clearing failure if the same cardId was previously marked.
      clearFailureForCard(due.cardId);
    } else if (isPermanentReason(result.reason)) {
      writeQueue(fresh.filter((w) => w.id !== due.id));
      failures.set(due.cardId, {
        cardId: due.cardId,
        reason: result.reason,
        payload: due.payload,
        target: due.target,
      });
      notifyFailures();
    } else {
      const attempt = due.attempt + 1;
      const idx = Math.min(attempt - 1, BACKOFF_MS.length - 1);
      const backoff = BACKOFF_MS[idx]!;
      const updated: PendingWrite = {
        ...due,
        attempt,
        nextAt: Date.now() + backoff,
        lastError: result.reason,
      };
      writeQueue(fresh.map((w) => (w.id === due.id ? updated : w)));
    }
  } finally {
    running = false;
    scheduleNext();
  }
}

/**
 * Wire the executor and start draining the persisted queue. Idempotent —
 * call once from `app/layout.tsx` on boot.
 */
export function startPendingWriteWorker(exec: Executor): void {
  executor = exec;
  scheduleNext();
}

/** Stop the worker (mainly for tests + unmount). */
export function stopPendingWriteWorker(): void {
  executor = null;
  clearTimer();
}

/** Manual retry — re-queues a failed entry at attempt=0, clears the pill. */
export function retryFailureForCard(cardId: string): void {
  const failure = failures.get(cardId);
  if (!failure) return;
  enqueueWrite({
    kind: "accept",
    cardId,
    payload: failure.payload,
    target: failure.target,
  });
  clearFailureForCard(cardId);
}

/** Test-only — wipe state for clean reruns. */
export function _resetPendingWritesForTest(): void {
  stopPendingWriteWorker();
  failures.clear();
  failureListeners.clear();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(QUEUE_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
