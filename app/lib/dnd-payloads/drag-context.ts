"use client";

/**
 * Global drag-context store. Producers (drag sources) call `beginDrag` on
 * `dragstart` and `endDrag` on `dragend`. Drop targets subscribe via
 * `useDragContext` so they can decide whether to render the accent overlay
 * — the HTML5 DataTransfer is intentionally opaque during dragover (browsers
 * block `getData(...)` reads outside the drop event), so this store is the
 * sanctioned channel for "what is currently being dragged".
 */
import { create } from "zustand";
import type { DragPayload, DragPayloadKind } from "./types";

type OverTarget = { cardId: string; targetId: string };

type DragContextState = {
  kind: DragPayloadKind | null;
  payload: DragPayload | null;
  /** Globally tracks the single drop target currently under the cursor. */
  overTarget: OverTarget | null;
  beginDrag: (payload: DragPayload) => void;
  endDrag: () => void;
  setOverTarget: (target: OverTarget) => void;
  clearOverTarget: (target: OverTarget) => void;
};

export const useDragContext = create<DragContextState>((set, get) => ({
  kind: null,
  payload: null,
  overTarget: null,
  beginDrag: (payload) => set({ kind: payload.kind, payload, overTarget: null }),
  endDrag: () => set({ kind: null, payload: null, overTarget: null }),
  setOverTarget: (target) => set({ overTarget: target }),
  clearOverTarget: (target) => {
    const cur = get().overTarget;
    if (cur && cur.cardId === target.cardId && cur.targetId === target.targetId) {
      set({ overTarget: null });
    }
  },
}));
