import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const WORKSPACES_KEY = "lens.workspaces";
const LEGACY_LAYOUT_KEY = "lens.layout";
const THEME_KEY = "lens.theme";

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
  // crypto.randomUUID is in node 18+; vitest tests run under node, but
  // stub a fallback if missing for older runtimes.
  if (typeof crypto === "undefined" || !("randomUUID" in crypto)) {
    let counter = 0;
    vi.stubGlobal("crypto", {
      randomUUID: () => `uuid_${++counter}`,
    });
  }
});

const importStore = async () => await import("@/lib/workspace/store");

describe("workspace store", () => {
  beforeEach(() => {
    storage.clear();
    fakeDocument.documentElement._attrs.clear();
    vi.resetModules();
  });

  afterEach(() => {
    storage.clear();
  });

  it("migrates legacy lens.layout into a Default workspace on first hydrate", async () => {
    const legacyLayout = {
      version: 2,
      cards: [
        {
          id: "c1",
          connector: "google-calendar",
          tile: "calendar-one-week",
          x: 0,
          y: 0,
          w: 8,
          h: 6,
          config: { calendarId: "primary" },
        },
      ],
    };
    storage.set(LEGACY_LAYOUT_KEY, JSON.stringify(legacyLayout));
    storage.set(THEME_KEY, "dark");

    const { useWorkspaceStore } = await importStore();
    useWorkspaceStore.getState().hydrate();
    const state = useWorkspaceStore.getState();

    expect(state.activeId).toBe("default");
    expect(state.workspaces).toHaveLength(1);
    expect(state.workspaces[0].id).toBe("default");
    expect(state.workspaces[0].name).toBe("Default");
    expect(state.workspaces[0].theme).toBe("dark");
    expect(state.workspaces[0].layout).toHaveLength(1);
    expect(state.workspaces[0].layout[0].tile).toBe("calendar-one-week");

    // Legacy key was removed
    expect(storage.get(LEGACY_LAYOUT_KEY)).toBeUndefined();
    // Workspaces key is now populated
    expect(storage.get(WORKSPACES_KEY)).toBeTruthy();
  });

  it("creates a Default workspace from scratch when no legacy data exists", async () => {
    const { useWorkspaceStore } = await importStore();
    useWorkspaceStore.getState().hydrate();
    const state = useWorkspaceStore.getState();

    expect(state.workspaces).toHaveLength(1);
    expect(state.workspaces[0].layout).toEqual([]);
    expect(state.workspaces[0].theme).toBe("light");
  });

  it("create() adds a new workspace and switches to it", async () => {
    const { useWorkspaceStore } = await importStore();
    useWorkspaceStore.getState().hydrate();
    const id = useWorkspaceStore.getState().create({ name: "Work", icon: "briefcase" });

    const state = useWorkspaceStore.getState();
    expect(state.workspaces).toHaveLength(2);
    expect(state.activeId).toBe(id);
    expect(state.workspaces.find((w) => w.id === id)?.name).toBe("Work");
    expect(state.workspaces.find((w) => w.id === id)?.icon).toBe("briefcase");
  });

  it("create() migrates legacy PascalCase icon names to kebab-case", async () => {
    const { useWorkspaceStore } = await importStore();
    useWorkspaceStore.getState().hydrate();
    const id = useWorkspaceStore.getState().create({ name: "Legacy", icon: "Briefcase" });
    expect(useWorkspaceStore.getState().workspaces.find((w) => w.id === id)?.icon).toBe("briefcase");
  });

  it("create() rejects empty / whitespace-only names", async () => {
    const { useWorkspaceStore } = await importStore();
    useWorkspaceStore.getState().hydrate();
    const id = useWorkspaceStore.getState().create({ name: "  " });
    expect(id).toBe("");
    expect(useWorkspaceStore.getState().workspaces).toHaveLength(1);
  });

  it("duplicate() deep-copies layout with fresh card ids", async () => {
    const legacyLayout = {
      version: 2,
      cards: [
        {
          id: "src-c1",
          connector: "scratchpad",
          tile: "note-buffer",
          x: 0,
          y: 0,
          w: 4,
          h: 6,
          config: {},
        },
      ],
    };
    storage.set(LEGACY_LAYOUT_KEY, JSON.stringify(legacyLayout));

    const { useWorkspaceStore } = await importStore();
    useWorkspaceStore.getState().hydrate();
    const newId = useWorkspaceStore.getState().duplicate("default");
    expect(newId).toBeTruthy();
    const dup = useWorkspaceStore.getState().workspaces.find((w) => w.id === newId);
    expect(dup?.name).toBe("Default (copy)");
    expect(dup?.layout).toHaveLength(1);
    // Card id was regenerated, not copied
    expect(dup?.layout[0].id).not.toBe("src-c1");
  });

  it("rename() updates name and updatedAt", async () => {
    const { useWorkspaceStore } = await importStore();
    useWorkspaceStore.getState().hydrate();
    const before = useWorkspaceStore.getState().workspaces[0].updatedAt;
    // Tick the clock so updatedAt advances
    vi.useFakeTimers();
    vi.setSystemTime(before + 1000);
    useWorkspaceStore.getState().rename("default", "Personal");
    vi.useRealTimers();
    const ws = useWorkspaceStore.getState().workspaces[0];
    expect(ws.name).toBe("Personal");
    expect(ws.updatedAt).toBeGreaterThan(before);
  });

  it("setIcon() rejects unknown icon names", async () => {
    const { useWorkspaceStore } = await importStore();
    useWorkspaceStore.getState().hydrate();
    useWorkspaceStore.getState().setIcon("default", "not-an-icon-name");
    expect(useWorkspaceStore.getState().workspaces[0].icon).toBe("layout-grid");
  });

  it("setIcon() accepts any valid lucide icon (not just quick-pick)", async () => {
    const { useWorkspaceStore } = await importStore();
    useWorkspaceStore.getState().hydrate();
    useWorkspaceStore.getState().setIcon("default", "heart");
    expect(useWorkspaceStore.getState().workspaces[0].icon).toBe("heart");
    // Non-quick-pick lucide name passes through (full lucide registry).
    useWorkspaceStore.getState().setIcon("default", "atom");
    expect(useWorkspaceStore.getState().workspaces[0].icon).toBe("atom");
  });

  it("setIcon() migrates a PascalCase legacy name to kebab-case", async () => {
    const { useWorkspaceStore } = await importStore();
    useWorkspaceStore.getState().hydrate();
    useWorkspaceStore.getState().setIcon("default", "TreePine");
    expect(useWorkspaceStore.getState().workspaces[0].icon).toBe("tree-pine");
  });

  it("remove() refuses to delete the last workspace", async () => {
    const { useWorkspaceStore } = await importStore();
    useWorkspaceStore.getState().hydrate();
    useWorkspaceStore.getState().remove("default");
    expect(useWorkspaceStore.getState().workspaces).toHaveLength(1);
  });

  it("remove() switches activeId when deleting the active workspace", async () => {
    const { useWorkspaceStore } = await importStore();
    useWorkspaceStore.getState().hydrate();
    const a = useWorkspaceStore.getState().create({ name: "B" });
    expect(useWorkspaceStore.getState().activeId).toBe(a);
    useWorkspaceStore.getState().remove(a);
    expect(useWorkspaceStore.getState().activeId).toBe("default");
    expect(useWorkspaceStore.getState().workspaces).toHaveLength(1);
  });

  it("switchTo() applies the target workspace's theme to the DOM", async () => {
    const { useWorkspaceStore } = await importStore();
    useWorkspaceStore.getState().hydrate();
    useWorkspaceStore.getState().create({ name: "Dark", theme: "dark" });
    const newId = useWorkspaceStore.getState().activeId;
    useWorkspaceStore.getState().switchTo("default");
    expect(fakeDocument.documentElement.getAttribute("data-theme")).toBe("light");
    useWorkspaceStore.getState().switchTo(newId);
    expect(fakeDocument.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("setActiveLayout() round-trips through localStorage", async () => {
    const { useWorkspaceStore } = await importStore();
    useWorkspaceStore.getState().hydrate();
    useWorkspaceStore.getState().setActiveLayout([
      {
        id: "c1",
        connector: "scratchpad",
        tile: "note-buffer",
        x: 0,
        y: 0,
        w: 4,
        h: 6,
        config: {},
      },
    ]);
    const persisted = JSON.parse(storage.get(WORKSPACES_KEY) ?? "{}");
    expect(persisted.workspaces[0].layout).toHaveLength(1);
    expect(persisted.workspaces[0].layout[0].id).toBe("c1");
  });
});
