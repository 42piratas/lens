import "server-only";
import { applyLabelToCard, ensureBoardLabel } from "@/connectors/trello/client";
import {
  getEventDescription,
  patchEvent as patchCalendarEvent,
} from "@/connectors/google-calendar/client";
import { IntegrationError as TrelloError } from "@/connectors/trello/types";
import { IntegrationError as CalendarError } from "@/connectors/google-calendar/types";

export const BACKOFF_MS = [1_000, 5_000, 30_000, 300_000] as const;

export type PendingItem = {
  id: string;
  user_id: string;
  connector: string;
  item: Record<string, unknown>;
  attempt: number;
  next_attempt_at: string;
  last_error: string | null;
};

export type ProcessResult =
  | { kind: "ok" }
  | { kind: "retry"; reason: string; nextAttemptAt: Date }
  | { kind: "permanent"; reason: string };

function nextAttemptAt(attempt: number): Date {
  const ms = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
  return new Date(Date.now() + ms);
}

/**
 * Server-side dispatcher for the pending-writes queue. Mirrors the
 * client-side b02-05 contract (`{ kind, payload, target }`) and dispatches
 * to the connector client functions.
 *
 * Returns:
 *   - ok        → caller deletes the row
 *   - retry     → caller updates attempt + next_attempt_at
 *   - permanent → caller keeps the row + sets last_error (the row stays
 *                 visible to the client as a reconnect pill)
 */
export async function processPendingWrite(item: PendingItem): Promise<ProcessResult> {
  try {
    if (item.connector === "trello") return await processTrello(item);
    if (item.connector === "google-calendar") return await processCalendar(item);
    return { kind: "permanent", reason: `unknown connector: ${item.connector}` };
  } catch (err) {
    if (err instanceof TrelloError || err instanceof CalendarError) {
      if (err.kind === "auth") return { kind: "permanent", reason: err.message };
      const next = nextAttemptAt(item.attempt + 1);
      return { kind: "retry", reason: err.message, nextAttemptAt: next };
    }
    const next = nextAttemptAt(item.attempt + 1);
    return { kind: "retry", reason: (err as Error).message, nextAttemptAt: next };
  }
}

async function processTrello(item: PendingItem): Promise<ProcessResult> {
  const payload = item.item as {
    kind?: string;
    payload?: { kind?: string; name?: string; description?: string; color?: string };
    target?: { id?: string; meta?: { boardId?: string } };
  };
  if (payload.kind !== "accept" || payload.payload?.kind !== "tag-like") {
    return { kind: "permanent", reason: "Trello queue: unsupported pending kind" };
  }
  const cardId = payload.target?.id;
  const boardId = payload.target?.meta?.boardId;
  const name = payload.payload.name?.trim();
  if (!cardId || !boardId || !name) {
    return { kind: "permanent", reason: "Trello queue: missing target/payload fields" };
  }
  const label = await ensureBoardLabel({
    boardId,
    name,
    color: payload.payload.color,
  });
  await applyLabelToCard({ cardId, labelId: label.id });
  return { kind: "ok" };
}

async function processCalendar(item: PendingItem): Promise<ProcessResult> {
  const payload = item.item as {
    kind?: string;
    payload?: { kind?: string; name?: string; description?: string };
    target?: { id?: string; meta?: { calendarId?: string } };
  };
  if (payload.kind !== "accept" || payload.payload?.kind !== "tag-like") {
    return { kind: "permanent", reason: "Calendar queue: unsupported pending kind" };
  }
  const eventId = payload.target?.id;
  const calendarId = payload.target?.meta?.calendarId;
  const name = payload.payload.name?.trim();
  if (!eventId || !calendarId || !name) {
    return { kind: "permanent", reason: "Calendar queue: missing target/payload fields" };
  }
  const prefix = payload.payload.description
    ? `[${name}] ${payload.payload.description}`
    : `[${name}]`;
  const existing = await getEventDescription({ calendarId, eventId });
  const description = existing.includes(prefix) ? existing : `${prefix}\n\n${existing}`.trim();
  await patchCalendarEvent({ calendarId, eventId, description });
  return { kind: "ok" };
}
