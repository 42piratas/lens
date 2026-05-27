import type { PayloadAdapter } from "@/connectors/types";
import type { ClipLikePayload } from "@/lib/dnd-payloads/types";
import type { ScratchpadConfig } from "../manifest";
import { setBinding } from "../client";

/**
 * Scratchpad accept-adapter for `clip-like` payloads. Replaces the
 * scratchpad's single binding with the new source — its body becomes the
 * editable content. Re-binding the same source is a no-op-equivalent overwrite.
 */
export const clipLikeAdapter: PayloadAdapter<ScratchpadConfig, ClipLikePayload> = {
  label: "Bind to scratchpad",

  canAccept(_card, payload) {
    if (payload.kind !== "clip-like") return false;
    if (!payload.label?.trim()) return false;
    if (!payload.source?.connector || !payload.source?.sourceId) return false;
    return true;
  },

  async onAccept(_card, payload) {
    try {
      setBinding({
        connector: payload.source.connector,
        sourceId: payload.source.sourceId,
        sourceTitle: payload.label,
        parentTitle: payload.parentTitle,
        originalContent: payload.originalContent,
        href: payload.href,
        meta: payload.meta,
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: (err as Error).message };
    }
  },
};
