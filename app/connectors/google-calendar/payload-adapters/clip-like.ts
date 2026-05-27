import type { PayloadAdapter } from "@/connectors/types";
import type { ClipLikePayload } from "@/lib/dnd-payloads/types";
import type { GoogleCalendarConfig } from "../manifest";

/**
 * Calendar adapter for `clip-like` round-trip. Calendar is the source — when
 * the operator edits the bound event's body in the scratchpad and blurs the
 * textarea, `onContentEdited` PATCHes the event's `description`. The retry
 * queue handles backoff + 401 reconnect-pill. `canAccept` is false because
 * Calendar doesn't absorb clips (the scratchpad does).
 */

export const clipLikeAdapter: PayloadAdapter<GoogleCalendarConfig, ClipLikePayload> = {
  label: "Round-trip Calendar event description",

  canAccept() {
    return false;
  },

  async onAccept() {
    return { ok: false, reason: "Calendar does not absorb clip-like payloads" };
  },

  async onContentEdited(_card, payload) {
    const eventId = payload.source.sourceId;
    if (!eventId.trim()) return { ok: false, reason: "missing source.sourceId" };
    const calendarId = payload.meta?.calendarId;
    if (!calendarId) return { ok: false, reason: "missing meta.calendarId" };
    try {
      const res = await fetch("/api/google/calendar/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarId,
          eventId,
          description: payload.originalContent,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        const detail = err?.error?.message ?? "Calendar API error";
        return { ok: false, reason: `Calendar API ${res.status} — ${detail}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: (err as Error).message };
    }
  },
};

