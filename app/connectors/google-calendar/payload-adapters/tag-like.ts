import type { PayloadAdapter } from "@/connectors/types";
import type { TagLikePayload } from "@/lib/dnd-payloads/types";
import type { GoogleCalendarConfig } from "../manifest";

/**
 * Calendar accept-adapter for `tag-like` payloads. Requires a per-event
 * target — the dropped badge prepends `[name] description` (or `[name]`)
 * to that specific event's description. The event's color is intentionally
 * NOT touched: Calendar event colors are user-meaningful (calendar grouping,
 * personal coding) and overwriting them would conflict with the operator's
 * existing system. Tag chips on the LENS side render the badge color via
 * a deterministic name-hash, independent of the Calendar event color.
 *
 * Tile-level drop (no `target.id`) is rejected with a friendly reason — the
 * tile body's ambient state announces compatibility, but the actual drop
 * must hit a specific event row.
 *
 * Requires the `calendar.events` write scope on the OAuth refresh token.
 * Read-only tokens reject the PATCH with 401 and surface the inline reconnect
 * pill.
 */

export const tagLikeAdapter: PayloadAdapter<GoogleCalendarConfig, TagLikePayload> = {
  label: "Apply as Calendar tag",
  rowLabel: "Tag this event",

  canAccept(card, payload) {
    if (payload.kind !== "tag-like") return false;
    if (!payload.name?.trim()) return false;
    return Boolean(card.config.calendarIds && card.config.calendarIds.length > 0);
  },

  canAcceptTarget(_card, _payload, target) {
    return typeof target?.id === "string" && target.id.length > 0;
  },

  invalidateOnAccept() {
    return [["google", "events"]];
  },

  async onAccept(card, payload, target) {
    if (!target?.id) {
      return {
        ok: false,
        reason: "drop on a specific calendar event, not the tile background",
      };
    }
    // Prefer the event's own calendarId (multi-calendar tiles); fall back
    // to the first configured calendar if the target didn't carry meta.
    const calendarId =
      target.meta?.calendarId ?? card.config.calendarIds?.[0];
    if (!calendarId) return { ok: false, reason: "no calendar configured" };
    try {
      const prefix = payload.description
        ? `[${payload.name}] ${payload.description}`
        : `[${payload.name}]`;
      const res = await fetch("/api/google/calendar/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarId,
          eventId: target.id,
          descriptionPrefix: prefix,
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
