"use client";

import { create } from "zustand";

type ChatStore = {
  open: boolean;
  toggle: () => void;
  close: () => void;
};

export const useChatStore = create<ChatStore>((set) => ({
  open: false,
  toggle: () => set((s) => ({ open: !s.open })),
  close: () => set({ open: false }),
}));
