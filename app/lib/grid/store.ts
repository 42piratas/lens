"use client";

import { create } from "zustand";

export type GridStore = {
  gridVisible: boolean;
  manualOverride: boolean;
  setGridVisible: (next: boolean) => void;
  toggleGridVisible: () => void;
  applyAuto: (next: boolean) => void;
};

export const useGridStore = create<GridStore>((set) => ({
  gridVisible: true,
  manualOverride: false,
  setGridVisible: (gridVisible) => set({ gridVisible, manualOverride: true }),
  toggleGridVisible: () =>
    set((s) => ({ gridVisible: !s.gridVisible, manualOverride: true })),
  applyAuto: (gridVisible) => set({ gridVisible, manualOverride: false }),
}));
