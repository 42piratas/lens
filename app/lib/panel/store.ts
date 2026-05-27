"use client";

import { create } from "zustand";

export type PanelMode = "closed" | "add" | "edit";

export type PanelDraft = {
  connector?: string;
  tile?: string;
  w?: number;
  h?: number;
  config?: unknown;
};

type PanelStore = {
  mode: PanelMode;
  editingId?: string;
  draft: PanelDraft;
  open: () => void;
  openEdit: (
    id: string,
    seed: { connector: string; tile: string; w: number; h: number; config: unknown },
  ) => void;
  close: () => void;
  setDraft: (partial: PanelDraft) => void;
  resetDraft: () => void;
};

const emptyDraft: PanelDraft = {};

export const usePanelStore = create<PanelStore>((set) => ({
  mode: "closed",
  editingId: undefined,
  draft: emptyDraft,
  open: () => set({ mode: "add", editingId: undefined, draft: emptyDraft }),
  openEdit: (id, seed) =>
    set({
      mode: "edit",
      editingId: id,
      draft: {
        connector: seed.connector,
        tile: seed.tile,
        w: seed.w,
        h: seed.h,
        config: seed.config,
      },
    }),
  close: () => set({ mode: "closed", editingId: undefined, draft: emptyDraft }),
  setDraft: (partial) =>
    set((state) => ({ draft: { ...state.draft, ...partial } })),
  resetDraft: () => set({ draft: emptyDraft }),
}));
