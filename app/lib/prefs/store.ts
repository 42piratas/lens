"use client";

import { useEffect } from "react";
import { create } from "zustand";
import {
  DEFAULT_DOCK_POS,
  DEFAULT_FONT_SCALE,
  DOCK_POS_STORAGE_KEY,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FONT_SCALE_STORAGE_KEY,
  LEGACY_SIDEBAR_POS_STORAGE_KEY,
  type DockPos,
} from "./bootstrap";

type PrefsState = {
  hydrated: boolean;
  fontScale: number;
  dockPos: DockPos;
  setFontScale: (next: number) => void;
  resetFontScale: () => void;
  setDockPos: (next: DockPos) => void;
  hydrate: () => void;
};

const safeGet = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key: string, value: string) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
};

const safeRemove = (key: string) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

const clampScale = (n: number): number => {
  if (!isFinite(n)) return DEFAULT_FONT_SCALE;
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, n));
};

const applyFontScale = (n: number) => {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--font-scale", String(n));
};

const applyDockPos = (pos: DockPos) => {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-dock-pos", pos);
};

const readDockPosWithMigration = (): DockPos => {
  const current = safeGet(DOCK_POS_STORAGE_KEY);
  if (current === "left" || current === "right") return current;
  if (current != null) return DEFAULT_DOCK_POS;
  const legacy = safeGet(LEGACY_SIDEBAR_POS_STORAGE_KEY);
  if (legacy === "left" || legacy === "right") {
    safeSet(DOCK_POS_STORAGE_KEY, legacy);
    safeRemove(LEGACY_SIDEBAR_POS_STORAGE_KEY);
    return legacy;
  }
  return DEFAULT_DOCK_POS;
};

export const usePrefsStore = create<PrefsState>((set, get) => ({
  hydrated: false,
  fontScale: DEFAULT_FONT_SCALE,
  dockPos: DEFAULT_DOCK_POS,

  hydrate: () => {
    if (get().hydrated) return;
    const fsRaw = safeGet(FONT_SCALE_STORAGE_KEY);
    const fs = clampScale(parseFloat(fsRaw ?? ""));
    const dp = readDockPosWithMigration();
    applyFontScale(fs);
    applyDockPos(dp);
    set({ hydrated: true, fontScale: fs, dockPos: dp });
  },

  setFontScale: (next) => {
    const v = clampScale(next);
    safeSet(FONT_SCALE_STORAGE_KEY, String(v));
    applyFontScale(v);
    set({ fontScale: v });
  },

  resetFontScale: () => {
    safeSet(FONT_SCALE_STORAGE_KEY, String(DEFAULT_FONT_SCALE));
    applyFontScale(DEFAULT_FONT_SCALE);
    set({ fontScale: DEFAULT_FONT_SCALE });
  },

  setDockPos: (next) => {
    safeSet(DOCK_POS_STORAGE_KEY, next);
    applyDockPos(next);
    set({ dockPos: next });
  },
}));

export function usePrefsBootstrap() {
  const hydrate = usePrefsStore((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
}
