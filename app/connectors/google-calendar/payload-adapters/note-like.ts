import type { PayloadAdapter } from "@/connectors/types";
import type { NoteLikePayload } from "@/lib/dnd-payloads/types";
import { noteEnvelope } from "@/lib/dnd-payloads/note-envelope";
import type { GoogleCalendarConfig } from "../manifest";

/**
 * Calendar adapter for `note-like` (b02-09). Appends the note envelope to the
 * targeted event's description. Idempotency runs server-side via the existing
 * `/api/google/calendar/events` PATCH route's `descriptionAppend` branch
 * (GET existing description, skip the PATCH if the body already trails).
 *
 * Per-event only — `canAcceptTarget` requires `target.id` AND
 * `target.meta.calendarId` (the b02-06 calendar-event drop targets thread
 * `calendarId` exactly the same way).
 */

type ApiError = { error?: { message?: string } } | null;

export const noteLikeAdapter: PayloadAdapter<GoogleCalendarConfig, NoteLikePayload> = {
  label: "Calendar event description",

  canAccept(_card, payload) {
    return payload.kind === "note-like";
  },

  canAcceptTarget(_card, _payload, target) {
    return Boolean(target?.id && target?.meta?.calendarId);
  },

  async onAccept(_card, payload, target) {
    const eventId = target?.id;
    const calendarId = target?.meta?.calendarId;
    if (!eventId) return { ok: false, reason: "missing target.id" };
    if (!calendarId) return { ok: false, reason: "missing target.meta.calendarId" };
    try {
      const res = await fetch("/api/google/calendar/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarId,
          eventId,
          descriptionAppend: noteEnvelope(payload),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as ApiError;
        const detail = data?.error?.message ?? "Calendar API error";
        return { ok: false, reason: `Calendar API ${res.status} — ${detail}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: (err as Error).message };
    }
  },

  invalidateOnAccept() {
    return [["google", "events"]];
  },
};
