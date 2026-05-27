import type { PayloadAdapter } from "@/connectors/types";
import type { ClipLikePayload } from "@/lib/dnd-payloads/types";
import type { TrelloConfig } from "../manifest";

/**
 * Trello adapter for `clip-like` round-trip. Trello is the source — when
 * the operator edits the bound card's body in the scratchpad and blurs the
 * textarea, `onContentEdited` PUTs the new desc back via
 * `/api/trello/cards/{cardId}`. The retry queue handles backoff + 401
 * reconnect-pill. `canAccept` is false because Trello doesn't absorb clips
 * (the scratchpad does).
 */

export const clipLikeAdapter: PayloadAdapter<TrelloConfig, ClipLikePayload> = {
  label: "Round-trip Trello card description",

  canAccept() {
    return false;
  },

  async onAccept() {
    return { ok: false, reason: "Trello does not absorb clip-like payloads" };
  },

  async onContentEdited(_card, payload) {
    const trelloCardId = payload.source.sourceId;
    if (!trelloCardId.trim()) {
      return { ok: false, reason: "missing source.sourceId" };
    }
    try {
      const res = await fetch(
        `/api/trello/cards/${encodeURIComponent(trelloCardId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ desc: payload.originalContent }),
        },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        const detail = err?.error?.message ?? "Trello API error";
        return { ok: false, reason: `Trello API ${res.status} — ${detail}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: (err as Error).message };
    }
  },
};
