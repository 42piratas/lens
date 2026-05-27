import type { PayloadAdapter } from "@/connectors/types";
import type { TagLikePayload } from "@/lib/dnd-payloads/types";
import type { TrelloConfig } from "../manifest";

/**
 * Trello accept-adapter for `tag-like` payloads. Requires a per-card-row
 * target — the dropped label is ensured on the board (idempotent reuse-by-name)
 * AND applied to the specific Trello card the badge was dropped on.
 *
 * Tile-level drop (no `target.id`) is rejected with a friendly reason so the
 * pending-writes queue surfaces a transient pill rather than silently failing.
 */
export const tagLikeAdapter: PayloadAdapter<TrelloConfig, TagLikePayload> = {
  label: "Apply as Trello label",
  rowLabel: "Tag this card",

  canAccept(card, payload) {
    if (payload.kind !== "tag-like") return false;
    if (!payload.name?.trim()) return false;
    return Boolean(card.config.boardId);
  },

  canAcceptTarget(_card, _payload, target) {
    return typeof target?.id === "string" && target.id.length > 0;
  },

  invalidateOnAccept() {
    return [["trello", "cards"]];
  },

  async onAccept(card, payload, target) {
    const boardId = card.config.boardId;
    if (!boardId) return { ok: false, reason: "no boardId on card" };
    if (!target?.id) {
      return {
        ok: false,
        reason: "drop on a specific Trello card, not the tile background",
      };
    }
    try {
      const res = await fetch("/api/trello/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardId,
          name: payload.name.trim(),
          color: payload.color,
          cardId: target.id,
        }),
      });
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
