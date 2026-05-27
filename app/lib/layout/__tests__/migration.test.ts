import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const LEGACY_LAYOUT_KEY = "lens.layout";
const WORKSPACES_KEY = "lens.workspaces";

// Minimal window+localStorage + document stub. Layout store now reads through
// the workspace store; the workspace migration touches localStorage AND
// document (to apply theme on switch).
const storage = new Map<string, string>();
const fakeWindow = {
  localStorage: {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => {
      storage.set(k, v);
    },
    removeItem: (k: string) => {
      storage.delete(k);
    },
    clear: () => storage.clear(),
  },
};
const fakeDocument = {
  documentElement: {
    _attrs: new Map<string, string>(),
    setAttribute(name: string, value: string) {
      this._attrs.set(name, value);
    },
    getAttribute(name: string) {
      return this._attrs.get(name) ?? null;
    },
  },
};

beforeAll(() => {
  vi.stubGlobal("window", fakeWindow);
  vi.stubGlobal("document", fakeDocument);
});

// Lazy import so the module re-evaluates after the global stub is in place.
const importStore = async () =>
  await import("@/lib/layout/store");

describe("layout legacy tile-id migration", () => {
  beforeEach(() => {
    storage.clear();
    fakeDocument.documentElement._attrs.clear();
    vi.resetModules();
  });

  afterEach(() => {
    storage.clear();
  });

  it("rewrites pre-consolidation tile ids on hydrate", async () => {
    const stale = {
      version: 2,
      cards: [
        {
          id: "c1",
          connector: "goodreads",
          tile: "goodreads-shelf",
          x: 0,
          y: 0,
          w: 3,
          h: 8,
          config: { userId: "1", shelfName: "currently-reading" },
        },
        {
          id: "c2",
          connector: "trello",
          tile: "trello-list",
          x: 4,
          y: 0,
          w: 3,
          h: 8,
          config: { boardId: "b" },
        },
        {
          id: "c3",
          connector: "google-calendar",
          tile: "google-calendar-macro",
          x: 0,
          y: 9,
          w: 12,
          h: 4,
          config: {},
        },
      ],
    };
    storage.set(LEGACY_LAYOUT_KEY, JSON.stringify(stale));

    const { useLayoutStore } = await importStore();
    useLayoutStore.getState().hydrate();
    const cards = useLayoutStore.getState().cards;

    expect(cards.find((c) => c.id === "c1")?.tile).toBe("media-list");
    expect(cards.find((c) => c.id === "c2")?.tile).toBe("task-list");
    expect(cards.find((c) => c.id === "c3")?.tile).toBe("calendar-many-weeks");
  });

  it("lifts keep filter into per-card config when migrating keep-recent / keep-label", async () => {
    const stale = {
      version: 2,
      cards: [
        {
          id: "c-recent",
          connector: "keep",
          tile: "keep-recent",
          x: 0,
          y: 0,
          w: 3,
          h: 8,
          config: {},
        },
        {
          id: "c-label",
          connector: "keep",
          tile: "keep-label",
          x: 4,
          y: 0,
          w: 3,
          h: 8,
          config: { label: "ideas" },
        },
      ],
    };
    storage.set(LEGACY_LAYOUT_KEY, JSON.stringify(stale));

    const { useLayoutStore } = await importStore();
    useLayoutStore.getState().hydrate();
    const cards = useLayoutStore.getState().cards;

    const recent = cards.find((c) => c.id === "c-recent");
    expect(recent?.tile).toBe("note-cards");
    expect((recent?.config as { filter?: string }).filter).toBe("recent");

    const label = cards.find((c) => c.id === "c-label");
    expect(label?.tile).toBe("note-cards");
    expect((label?.config as { filter?: string }).filter).toBe("label");
    expect((label?.config as { label?: string }).label).toBe("ideas");
  });

  it("persists migrated cards back to localStorage (workspaces envelope)", async () => {
    const stale = {
      version: 2,
      cards: [
        {
          id: "c1",
          connector: "trakt",
          tile: "trakt-list",
          x: 0,
          y: 0,
          w: 3,
          h: 8,
          config: {},
        },
      ],
    };
    storage.set(LEGACY_LAYOUT_KEY, JSON.stringify(stale));

    const { useLayoutStore } = await importStore();
    useLayoutStore.getState().hydrate();

    // Cards are now persisted under lens.workspaces[0].layout, with stale
    // legacy tile id rewritten on read.
    const persisted = JSON.parse(storage.get(WORKSPACES_KEY) ?? "{}") as {
      workspaces: { layout: { tile: string }[] }[];
    };
    // Stored layout still has legacy id (workspace store doesn't rewrite —
    // layout store does via migrateTileIds on read).
    expect(persisted.workspaces[0].layout[0].tile).toBe("trakt-list");
    // Layout store presents the migrated id in memory.
    expect(useLayoutStore.getState().cards[0].tile).toBe("media-list");
  });

  it("leaves already-migrated tile ids untouched", async () => {
    const fresh = {
      version: 2,
      cards: [
        {
          id: "c1",
          connector: "goodreads",
          tile: "media-list",
          x: 0,
          y: 0,
          w: 3,
          h: 8,
          config: {},
        },
      ],
    };
    storage.set(LEGACY_LAYOUT_KEY, JSON.stringify(fresh));

    const { useLayoutStore } = await importStore();
    useLayoutStore.getState().hydrate();
    const cards = useLayoutStore.getState().cards;
    expect(cards[0].tile).toBe("media-list");
  });
});
