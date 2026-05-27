"use client";

/**
 * Selection-binding primitive — the b02-06 surface. Producers call
 * `bindSource(payload)` from a row-level click handler; the hook overwrites
 * the scratchpad's single binding with the source identity + body, and the
 * note-buffer tile renders that one editable doc.
 *
 * Re-clicking the same row clears the binding (toggle UX). The note-buffer
 * tile's blur handler enqueues `clip-edit` writes through the retry queue —
 * this hook only mutates local state.
 *
 * `isBound(connector, sourceId)` drives the shared `data-clipped` highlight
 * on the bound row in the producer tile.
 */
import { useCallback } from "react";
import { useScratchpad } from "@/lib/hooks/use-scratchpad";
import type { ClipLikePayload } from "./types";

export function useClips() {
  const { state, setBinding, clearBinding } = useScratchpad();

  const isClipped = useCallback(
    (connector: string, sourceId: string): boolean =>
      state.binding?.connector === connector &&
      state.binding?.sourceId === sourceId,
    [state.binding],
  );

  const toggleClip = useCallback(
    (payload: ClipLikePayload): void => {
      const bound =
        state.binding?.connector === payload.source.connector &&
        state.binding?.sourceId === payload.source.sourceId;
      if (bound) {
        clearBinding();
        return;
      }
      setBinding({
        connector: payload.source.connector,
        sourceId: payload.source.sourceId,
        sourceTitle: payload.label,
        parentTitle: payload.parentTitle,
        originalContent: payload.originalContent,
        href: payload.href,
        meta: payload.meta,
      });
    },
    [state.binding, setBinding, clearBinding],
  );

  return { state, isClipped, toggleClip };
}
