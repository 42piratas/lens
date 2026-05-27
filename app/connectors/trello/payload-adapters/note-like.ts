import type { PayloadAdapter } from "@/connectors/types";
import type { NoteLikePayload } from "@/lib/dnd-payloads/types";
import { noteEnvelope } from "@/lib/dnd-payloads/note-envelope";
import type { TrelloConfig } from "../manifest";

/**
 * Trello adapter for `note-like` (b02-09) — single behavior: append the note
 * envelope to the targeted card's description. Per-row only (`canAcceptTarget`
 * requires `target.id`); tile-level drops on the kanban background are inert.
 *
 * Idempotency runs server-side via `/api/trello/cards/[cardId]` PUT route's
 * `descAppend` branch — server reads the current desc, suffix-skips if the
 * envelope already trails it, otherwise appends + writes.
 */

type ApiError = { error?: { message?: string } } | null;

export const noteLikeAdapter: PayloadAdapter<TrelloConfig, NoteLikePayload> = {
  label: "Trello card description",

  canAccept(_card, payload) {
    return payload.kind === "note-like";
  },

  canAcceptTarget(_card, _payload, target) {
    return Boolean(target?.id);
  },

  async onAccept(_card, payload, target) {
    const cardId = target?.id;
    if (!cardId) return { ok: false, reason: "missing target.id" };
    try {
      const res = await fetch(`/api/trello/cards/${encodeURIComponent(cardId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descAppend: noteEnvelope(payload) }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as ApiError;
        const detail = data?.error?.message ?? "Trello API error";
        return { ok: false, reason: `Trello API ${res.status} — ${detail}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: (err as Error).message };
    }
  },

  invalidateOnAccept() {
    return [["trello", "cards"]];
  },
};
