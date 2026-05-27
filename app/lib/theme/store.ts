"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { DEFAULT_THEME_ID, getTheme, getThemes } from "@/themes";
import { isDarkFamily } from "@/themes/types";
import { useWorkspaceStore } from "@/lib/workspace/store";
import {
  DARK_PICK_STORAGE_KEY,
  DEFAULT_DARK_PICK,
  DEFAULT_LIGHT_PICK,
  DEFAULT_THEME_MODE,
  LIGHT_PICK_STORAGE_KEY,
  THEME_MODE_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from "./bootstrap";

export type Theme = string;

type ThemeState = {
  /** Active theme id (mirrors active workspace's theme). */
  theme: Theme;
  /** Preferred light-mode theme id. Global; survives workspace switches. */
  lightThemeId: Theme;
  /** Preferred dark-mode theme id. Global; survives workspace switches. */
  darkThemeId: Theme;
  /** Set active theme. Updates active workspace AND the per-mode preference. */
  setTheme: (id: Theme) => void;
  /** Set light-mode preference without flipping active theme; if active is light, also activates. */
  setLightPreference: (id: Theme) => void;
  /** Set dark-mode preference without flipping active theme; if active is dark, also activates. */
  setDarkPreference: (id: Theme) => void;
  /** Flip between lightThemeId and darkThemeId. */
  toggle: () => void;
  /** Reconcile state from the DOM/localStorage post-hydration. */
  syncFromDom: () => void;
};

const applyToDom = (id: Theme) => {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", id);
  // Mirror the mode onto data-theme-mode so the shared paper-pattern CSS
  // (and any future mode-scoped pattern) can target it. Falls back to
  // DEFAULT_THEME_MODE for unknown ids (will be reconciled post-hydration).
  const t = getTheme(id);
  const mode = t?.mode ?? DEFAULT_THEME_MODE;
  document.documentElement.setAttribute("data-theme-mode", mode);
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

const validateId = (id: string | null | undefined, fallback: string): string => {
  if (typeof id !== "string" || id.length === 0) return fallback;
  return getTheme(id) ? id : fallback;
};

let workspaceSubscribed = false;

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: DEFAULT_THEME_ID,
  lightThemeId: DEFAULT_LIGHT_PICK,
  darkThemeId: DEFAULT_DARK_PICK,

  setTheme: (id) => {
    const t = getTheme(id);
    if (!t) return;
    safeSet(THEME_STORAGE_KEY, id);
    safeSet(THEME_MODE_STORAGE_KEY, t.mode);
    // Dark-family themes (dark + dark-paper) update the dark preference;
    // light themes update the light preference.
    if (t.mode === "light") safeSet(LIGHT_PICK_STORAGE_KEY, id);
    else safeSet(DARK_PICK_STORAGE_KEY, id);
    applyToDom(id);
    // Push the active theme into the active workspace so it persists with it.
    useWorkspaceStore.getState().setActiveTheme(id);
    set({
      theme: id,
      ...(t.mode === "light" ? { lightThemeId: id } : { darkThemeId: id }),
    });
  },

  setLightPreference: (id) => {
    const t = getTheme(id);
    if (!t || t.mode !== "light") return;
    safeSet(LIGHT_PICK_STORAGE_KEY, id);
    set({ lightThemeId: id });
    const active = getTheme(get().theme);
    if (active?.mode === "light") get().setTheme(id);
  },

  setDarkPreference: (id) => {
    const t = getTheme(id);
    // Accept any dark-family theme (dark + dark-paper) as a dark preference.
    if (!t || !isDarkFamily(t.mode)) return;
    safeSet(DARK_PICK_STORAGE_KEY, id);
    set({ darkThemeId: id });
    const active = getTheme(get().theme);
    if (active && isDarkFamily(active.mode)) get().setTheme(id);
  },

  toggle: () => {
    const { theme, lightThemeId, darkThemeId } = get();
    const current = getTheme(theme);
    // From any dark-family theme → light pick; from light → dark pick.
    const next = current && isDarkFamily(current.mode) ? lightThemeId : darkThemeId;
    get().setTheme(next);
  },

  syncFromDom: () => {
    if (typeof document === "undefined") return;
    // Ensure workspace store has hydrated so we can read the active theme.
    const ws = useWorkspaceStore.getState();
    if (!ws.hydrated) ws.hydrate();
    const active = useWorkspaceStore
      .getState()
      .workspaces.find((w) => w.id === useWorkspaceStore.getState().activeId);
    const lightPick = validateId(safeGet(LIGHT_PICK_STORAGE_KEY), DEFAULT_LIGHT_PICK);
    const darkPick = validateId(safeGet(DARK_PICK_STORAGE_KEY), DEFAULT_DARK_PICK);
    const validated = validateId(active?.theme ?? safeGet(THEME_STORAGE_KEY), lightPick);
    applyToDom(validated);
    safeSet(THEME_STORAGE_KEY, validated);
    set({
      theme: validated,
      lightThemeId: lightPick,
      darkThemeId: darkPick,
    });
    // Subscribe to workspace switches once.
    if (!workspaceSubscribed) {
      workspaceSubscribed = true;
      useWorkspaceStore.subscribe((next, prev) => {
        const nextActive = next.workspaces.find((w) => w.id === next.activeId);
        const prevActive = prev.workspaces.find((w) => w.id === prev.activeId);
        if (nextActive?.id !== prevActive?.id || nextActive?.theme !== prevActive?.theme) {
          const id = validateId(nextActive?.theme, get().lightThemeId);
          if (id !== get().theme) {
            applyToDom(id);
            safeSet(THEME_STORAGE_KEY, id);
            set({ theme: id });
          }
        }
      });
    }
  },
}));

export function useThemeBootstrap() {
  const syncFromDom = useThemeStore((s) => s.syncFromDom);
  useEffect(() => {
    syncFromDom();
  }, [syncFromDom]);
}

/** Picker helper — group by mode for UI. Passing `"dark"` returns the full
 *  dark family (dark + dark-paper); the picker renders one combined group. */
export function getThemesByMode(mode: "light" | "dark") {
  if (mode === "light") return getThemes().filter((t) => t.mode === "light");
  return getThemes().filter((t) => isDarkFamily(t.mode));
}
