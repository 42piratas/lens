"use client";

import { create } from "zustand";
import type { LayoutCard } from "@/connectors/types";
import { useWorkspaceStore } from "@/lib/workspace/store";

/**
 * Tile-id rename map (b02-08 consolidation).
 * Old per-connector tile ids → new functional, provider-agnostic ids.
 * Applied during workspace migration / on read of any legacy persisted layout.
 */
const TILE_ID_RENAMES: Record<string, string> = {
  "google-calendar-today": "calendar-one-day",
  "google-calendar-week": "calendar-one-week",
  "google-calendar-month": "calendar-one-month",
  "google-calendar-macro": "calendar-many-weeks",
  "google-sheets-cell": "data-stat",
  "google-sheets-range": "data-table",
  "google-tasks-list": "task-list",
  "google-tasks-due": "task-due",
  "goodreads-shelf": "media-list",
  "trakt-list": "media-list",
  "trello-list": "task-list",
  "trello-board": "kanban-board",
  "trello-due": "task-due",
  "keep-recent": "note-cards",
  "keep-label": "note-cards",
  "scratchpad-list": "note-buffer",
};

/** Used during legacy migration in `lib/workspace/store.ts` and tests. */
export function migrateTileIds(cards: LayoutCard[]): LayoutCard[] {
  return cards.map((c) => {
    const newTile = TILE_ID_RENAMES[c.tile];
    if (!newTile) return c;
    let nextConfig = c.config as Record<string, unknown> | unknown;
    if (c.connector === "keep" && (c.tile === "keep-recent" || c.tile === "keep-label")) {
      nextConfig = {
        ...(c.config as Record<string, unknown>),
        filter: c.tile === "keep-label" ? "label" : "recent",
      };
    }
    return { ...c, tile: newTile, config: nextConfig };
  });
}

type LayoutStore = {
  cards: LayoutCard[];
  hydrated: boolean;
  hydrate: () => void;
  addCard: (card: LayoutCard) => void;
  updateCard: (id: string, partial: Partial<LayoutCard>) => void;
  replaceCards: (cards: LayoutCard[]) => void;
  removeCard: (id: string) => void;
};

export const useLayoutStore = create<LayoutStore>((set, get) => ({
  cards: [],
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    const ws = useWorkspaceStore.getState();
    if (!ws.hydrated) ws.hydrate();
    const active = useWorkspaceStore.getState().workspaces.find(
      (w) => w.id === useWorkspaceStore.getState().activeId,
    );
    set({ cards: migrateTileIds(active?.layout ?? []), hydrated: true });
    // Mirror future workspace changes (active id swap or active layout edits).
    useWorkspaceStore.subscribe((next, prev) => {
      const nextActive = next.workspaces.find((w) => w.id === next.activeId);
      const prevActive = prev.workspaces.find((w) => w.id === prev.activeId);
      if (nextActive?.layout !== prevActive?.layout) {
        set({ cards: migrateTileIds(nextActive?.layout ?? []) });
      }
    });
  },

  addCard: (card) => {
    const next = [...get().cards, card];
    set({ cards: next });
    useWorkspaceStore.getState().setActiveLayout(next);
  },

  updateCard: (id, partial) => {
    const next = get().cards.map((c) =>
      c.id === id ? ({ ...c, ...partial } as LayoutCard) : c,
    );
    set({ cards: next });
    useWorkspaceStore.getState().setActiveLayout(next);
  },

  replaceCards: (cards) => {
    set({ cards });
    useWorkspaceStore.getState().setActiveLayout(cards);
  },

  removeCard: (id) => {
    const next = get().cards.filter((c) => c.id !== id);
    set({ cards: next });
    useWorkspaceStore.getState().setActiveLayout(next);
  },
}));

export function useCardById(cardId: string): LayoutCard | undefined {
  return useLayoutStore((s) => s.cards.find((c) => c.id === cardId));
}

