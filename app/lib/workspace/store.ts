"use client";

import { create } from "zustand";
import { z } from "zod";
import type { LayoutCard } from "@/connectors/types";
import { layoutStateSchema } from "@/lib/layout/schema";
import { DEFAULT_THEME_ID, getTheme } from "@/themes";
import {
  DARK_PICK_STORAGE_KEY,
  DEFAULT_DARK_PICK,
  DEFAULT_LIGHT_PICK,
  LIGHT_PICK_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from "@/lib/theme/bootstrap";
import {
  WORKSPACES_SCHEMA_VERSION,
  type Workspace,
  type WorkspacesState,
  workspacesStateSchema,
} from "./schema";
import { DEFAULT_WORKSPACE_ICON, isWorkspaceIconName, migrateLegacyIconName } from "./icons";

const STORAGE_KEY = "lens.workspaces";
const LEGACY_LAYOUT_KEY = "lens.layout";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `ws_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;

type Store = {
  hydrated: boolean;
  activeId: string;
  workspaces: Workspace[];
  hydrate: () => void;
  switchTo: (id: string) => void;
  create: (input: { name: string; icon?: string; theme?: string }) => string;
  duplicate: (id: string, suffix?: string) => string | null;
  rename: (id: string, name: string) => void;
  setIcon: (id: string, icon: string) => void;
  remove: (id: string) => void;
  /** Replace the active workspace's layout. */
  setActiveLayout: (cards: LayoutCard[]) => void;
  /** Set the active workspace's theme. Caller is the theme store. */
  setActiveTheme: (themeId: string) => void;
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

/**
 * Migrate legacy single-layout state into a one-workspace envelope.
 * Reads `lens.layout` (v2) and `lens.theme` if present, wraps them as
 * the "Default" workspace, and removes the legacy `lens.layout` key
 * (the theme keys stay — they encode global per-mode preferences).
 */
function migrateLegacy(): WorkspacesState {
  const now = Date.now();
  let cards: LayoutCard[] = [];
  let theme = safeGet(THEME_STORAGE_KEY) ?? DEFAULT_THEME_ID;
  if (!getTheme(theme)) theme = DEFAULT_THEME_ID;
  const rawLayout = safeGet(LEGACY_LAYOUT_KEY);
  if (rawLayout) {
    try {
      const parsed = layoutStateSchema.safeParse(JSON.parse(rawLayout));
      if (parsed.success) {
        cards = parsed.data.cards as unknown as LayoutCard[];
      }
    } catch {
      /* drop */
    }
  }
  const id = "default";
  const ws: Workspace = {
    id,
    name: "Default",
    icon: DEFAULT_WORKSPACE_ICON,
    createdAt: now,
    updatedAt: now,
    theme,
    layout: cards,
  };
  // Remove the legacy key so subsequent boots use lens.workspaces only.
  safeRemove(LEGACY_LAYOUT_KEY);
  return { version: WORKSPACES_SCHEMA_VERSION, activeId: id, workspaces: [ws] };
}

function readPersisted(): WorkspacesState {
  const raw = safeGet(STORAGE_KEY);
  if (!raw) return migrateLegacy();
  try {
    const parsed = workspacesStateSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return migrateLegacy();
    // Sanity: ensure activeId references an existing workspace.
    const exists = parsed.data.workspaces.some((w) => w.id === parsed.data.activeId);
    const activeId = exists ? parsed.data.activeId : parsed.data.workspaces[0]!.id;
    // Validate every workspace's theme + icon, fall back gracefully.
    // Pre-b02-08 persisted state used PascalCase lucide names; migrate.
    const workspaces = parsed.data.workspaces.map((w) => {
      const migratedIcon = migrateLegacyIconName(w.icon);
      return {
        ...w,
        theme: getTheme(w.theme) ? w.theme : DEFAULT_THEME_ID,
        icon: isWorkspaceIconName(migratedIcon) ? migratedIcon : DEFAULT_WORKSPACE_ICON,
      };
    });
    return { version: WORKSPACES_SCHEMA_VERSION, activeId, workspaces };
  } catch {
    return migrateLegacy();
  }
}

function persist(state: { activeId: string; workspaces: Workspace[] }) {
  const payload: WorkspacesState = {
    version: WORKSPACES_SCHEMA_VERSION,
    activeId: state.activeId,
    workspaces: state.workspaces,
  };
  safeSet(STORAGE_KEY, JSON.stringify(payload));
}

const PROTECTED_NAME_RE = /^.{1,80}$/;
const trimmedNonEmpty = z.string().regex(PROTECTED_NAME_RE);

export const useWorkspaceStore = create<Store>((set, get) => ({
  hydrated: false,
  activeId: "default",
  workspaces: [],

  hydrate: () => {
    if (get().hydrated) return;
    const persisted = readPersisted();
    set({
      activeId: persisted.activeId,
      workspaces: persisted.workspaces,
      hydrated: true,
    });
    // Persist (covers the migration case).
    persist({ activeId: persisted.activeId, workspaces: persisted.workspaces });
  },

  switchTo: (id) => {
    const ws = get().workspaces.find((w) => w.id === id);
    if (!ws) return;
    set({ activeId: id });
    persist({ activeId: id, workspaces: get().workspaces });
    // Apply the new workspace's theme to the DOM + theme persistence keys.
    const themeId = ws.theme;
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", themeId);
    }
    safeSet(THEME_STORAGE_KEY, themeId);
  },

  create: ({ name, icon, theme }) => {
    const trimmed = name.trim();
    if (!trimmedNonEmpty.safeParse(trimmed).success) return "";
    const id = newId();
    const now = Date.now();
    const activeWs = get().workspaces.find((w) => w.id === get().activeId);
    const themeId = theme ?? activeWs?.theme ?? DEFAULT_THEME_ID;
    const newWs: Workspace = {
      id,
      name: trimmed,
      icon: icon && isWorkspaceIconName(migrateLegacyIconName(icon)) ? migrateLegacyIconName(icon) : DEFAULT_WORKSPACE_ICON,
      createdAt: now,
      updatedAt: now,
      theme: getTheme(themeId) ? themeId : DEFAULT_THEME_ID,
      layout: [],
    };
    const workspaces = [...get().workspaces, newWs];
    set({ workspaces, activeId: id });
    persist({ activeId: id, workspaces });
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", newWs.theme);
    }
    safeSet(THEME_STORAGE_KEY, newWs.theme);
    return id;
  },

  duplicate: (id, suffix = " (copy)") => {
    const src = get().workspaces.find((w) => w.id === id);
    if (!src) return null;
    const newWsId = newId();
    const now = Date.now();
    const copy: Workspace = {
      ...src,
      id: newWsId,
      name: `${src.name}${suffix}`,
      createdAt: now,
      updatedAt: now,
      layout: src.layout.map((c) => ({ ...c, id: newId() })),
    };
    const workspaces = [...get().workspaces, copy];
    set({ workspaces, activeId: newWsId });
    persist({ activeId: newWsId, workspaces });
    return newWsId;
  },

  rename: (id, name) => {
    const trimmed = name.trim();
    if (!trimmedNonEmpty.safeParse(trimmed).success) return;
    const workspaces = get().workspaces.map((w) =>
      w.id === id ? { ...w, name: trimmed, updatedAt: Date.now() } : w,
    );
    set({ workspaces });
    persist({ activeId: get().activeId, workspaces });
  },

  setIcon: (id, icon) => {
    const migrated = migrateLegacyIconName(icon);
    if (!isWorkspaceIconName(migrated)) return;
    const workspaces = get().workspaces.map((w) =>
      w.id === id ? { ...w, icon: migrated, updatedAt: Date.now() } : w,
    );
    set({ workspaces });
    persist({ activeId: get().activeId, workspaces });
  },

  remove: (id) => {
    const all = get().workspaces;
    if (all.length <= 1) return; // never delete the last workspace
    const workspaces = all.filter((w) => w.id !== id);
    let activeId = get().activeId;
    if (activeId === id) activeId = workspaces[0]!.id;
    set({ workspaces, activeId });
    persist({ activeId, workspaces });
    const newActive = workspaces.find((w) => w.id === activeId);
    if (newActive && typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", newActive.theme);
      safeSet(THEME_STORAGE_KEY, newActive.theme);
    }
  },

  setActiveLayout: (cards) => {
    const activeId = get().activeId;
    const workspaces = get().workspaces.map((w) =>
      w.id === activeId ? { ...w, layout: cards, updatedAt: Date.now() } : w,
    );
    set({ workspaces });
    persist({ activeId, workspaces });
  },

  setActiveTheme: (themeId) => {
    if (!getTheme(themeId)) return;
    const activeId = get().activeId;
    const workspaces = get().workspaces.map((w) =>
      w.id === activeId ? { ...w, theme: themeId, updatedAt: Date.now() } : w,
    );
    set({ workspaces });
    persist({ activeId, workspaces });
  },
}));

/** Convenience selector. */
export function useActiveWorkspace(): Workspace | undefined {
  return useWorkspaceStore((s) => s.workspaces.find((w) => w.id === s.activeId));
}

// Re-exports kept lightweight; consumers import what they need from here.
export { DEFAULT_LIGHT_PICK, DEFAULT_DARK_PICK, LIGHT_PICK_STORAGE_KEY, DARK_PICK_STORAGE_KEY };
