"use client";

import { create } from "zustand";
import {
  EMPTY_PINBOARD_STATE,
  PINBOARD_SCHEMA_VERSION,
  pinboardStateSchema,
  pinUrlSchema,
  type Pin,
  type PinboardState,
} from "./schema";

const STORAGE_KEY = "lens.pinboard";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `pin_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;

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

function readPersisted(): PinboardState {
  const raw = safeGet(STORAGE_KEY);
  if (!raw) return EMPTY_PINBOARD_STATE;
  try {
    const parsed = pinboardStateSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return EMPTY_PINBOARD_STATE;
    return parsed.data;
  } catch {
    return EMPTY_PINBOARD_STATE;
  }
}

function persist(state: Omit<PinboardState, "version">) {
  const payload: PinboardState = {
    version: PINBOARD_SCHEMA_VERSION,
    enabled: state.enabled,
    pins: state.pins,
  };
  safeSet(STORAGE_KEY, JSON.stringify(payload));
}

type Store = {
  hydrated: boolean;
  enabled: boolean;
  pins: Pin[];
  hydrate: () => void;
  setEnabled: (next: boolean) => void;
  addPin: (input: { label: string; url: string; icon?: string }) => string | null;
  updatePin: (id: string, input: Partial<Pick<Pin, "label" | "url" | "icon">>) => void;
  removePin: (id: string) => void;
  /** Reorder by writing a new full id-ordered array; `order` field is rewritten 0..N. */
  reorderPins: (ids: string[]) => void;
};

function rewriteOrder(pins: Pin[]): Pin[] {
  return pins.map((p, i) => ({ ...p, order: i }));
}

function deriveLabelFromUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url.slice(0, 40);
  }
}

export const usePinboardStore = create<Store>((set, get) => ({
  hydrated: false,
  enabled: EMPTY_PINBOARD_STATE.enabled,
  pins: EMPTY_PINBOARD_STATE.pins,

  hydrate: () => {
    if (get().hydrated) return;
    const persisted = readPersisted();
    const ordered = rewriteOrder(
      [...persisted.pins].sort((a, b) => a.order - b.order),
    );
    set({ hydrated: true, enabled: persisted.enabled, pins: ordered });
    persist({ enabled: persisted.enabled, pins: ordered });
  },

  setEnabled: (next) => {
    set({ enabled: next });
    persist({ enabled: next, pins: get().pins });
  },

  addPin: ({ label, url, icon }) => {
    const urlCheck = pinUrlSchema.safeParse(url);
    if (!urlCheck.success) return null;
    const cleanUrl = urlCheck.data;
    const cleanLabel = (label.trim() || deriveLabelFromUrl(cleanUrl)).slice(0, 80);
    const cleanIcon = (icon ?? "").trim().slice(0, 80);
    const id = newId();
    const order = get().pins.length;
    const pin: Pin = { id, label: cleanLabel, url: cleanUrl, icon: cleanIcon, order };
    const pins = [...get().pins, pin];
    set({ pins });
    persist({ enabled: get().enabled, pins });
    return id;
  },

  updatePin: (id, input) => {
    const target = get().pins.find((p) => p.id === id);
    if (!target) return;
    let nextUrl = target.url;
    if (input.url != null) {
      const urlCheck = pinUrlSchema.safeParse(input.url);
      if (!urlCheck.success) return;
      nextUrl = urlCheck.data;
    }
    const nextLabel = input.label != null
      ? (input.label.trim() || deriveLabelFromUrl(nextUrl)).slice(0, 80)
      : target.label;
    const nextIcon = input.icon != null ? input.icon.trim().slice(0, 80) : target.icon;
    const pins = get().pins.map((p) =>
      p.id === id ? { ...p, label: nextLabel, url: nextUrl, icon: nextIcon } : p,
    );
    set({ pins });
    persist({ enabled: get().enabled, pins });
  },

  removePin: (id) => {
    const pins = rewriteOrder(get().pins.filter((p) => p.id !== id));
    set({ pins });
    persist({ enabled: get().enabled, pins });
  },

  reorderPins: (ids) => {
    const lookup = new Map(get().pins.map((p) => [p.id, p]));
    const reordered: Pin[] = [];
    for (const id of ids) {
      const p = lookup.get(id);
      if (p) reordered.push(p);
    }
    // Anything not in `ids` (defensive) is appended in original order.
    for (const p of get().pins) {
      if (!ids.includes(p.id)) reordered.push(p);
    }
    const pins = rewriteOrder(reordered);
    set({ pins });
    persist({ enabled: get().enabled, pins });
  },
}));
