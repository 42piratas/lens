"use client";

import { useMemo } from "react";
import { useLayoutStore } from "@/lib/layout/store";
import { findFirstAvailableSlot } from "@/lib/layout/placement";
import { usePanelStore } from "@/lib/panel/store";
import { getTile } from "@/tiles";
import { getSizeError } from "@/components/panel/SizePicker";

export function GhostPreview() {
  const panelMode = usePanelStore((s) => s.mode);
  const draft = usePanelStore((s) => s.draft);
  const editingId = usePanelStore((s) => s.editingId);
  const cards = useLayoutStore((s) => s.cards);

  const slot = useMemo(() => {
    if (panelMode === "closed") return null;
    if (!draft.connector || !draft.tile) return null;
    if (typeof draft.w !== "number" || typeof draft.h !== "number") return null;
    const tile = getTile(draft.tile);
    if (!tile) return null;
    if (getSizeError(tile, draft.w, draft.h)) return null;

    if (panelMode === "edit" && editingId) {
      const current = cards.find((c) => c.id === editingId);
      if (current) {
        const fitsAtCurrent =
          current.x + draft.w <= 20 &&
          current.y + draft.h <= 20 &&
          !cards.some(
            (c) =>
              c.id !== editingId &&
              current.x < c.x + c.w &&
              c.x < current.x + draft.w! &&
              current.y < c.y + c.h &&
              c.y < current.y + draft.h!,
          );
        if (fitsAtCurrent) return { x: current.x, y: current.y };
      }
      return findFirstAvailableSlot(cards, draft.w, draft.h, editingId);
    }

    return findFirstAvailableSlot(cards, draft.w, draft.h);
  }, [panelMode, draft.connector, draft.tile, draft.w, draft.h, editingId, cards]);

  if (!slot || typeof draft.w !== "number" || typeof draft.h !== "number") return null;

  return (
    <div
      className="grid-ghost-preview"
      aria-hidden
      style={{
        gridColumn: `${slot.x + 1} / span ${draft.w}`,
        gridRow: `${slot.y + 1} / span ${draft.h}`,
      }}
    />
  );
}
