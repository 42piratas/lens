import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const FONT_SCALE_KEY = "lens.prefs.fontScale";
const DOCK_POS_KEY = "lens.prefs.dockPos";
const LEGACY_SIDEBAR_POS_KEY = "lens.prefs.sidebarPos";

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

const docState = {
  attrs: new Map<string, string>(),
  styles: new Map<string, string>(),
};

const fakeDocument = {
  documentElement: {
    setAttribute(name: string, value: string) {
      docState.attrs.set(name, value);
    },
    getAttribute(name: string) {
      return docState.attrs.get(name) ?? null;
    },
    style: {
      setProperty(name: string, value: string) {
        docState.styles.set(name, value);
      },
    },
  },
};

beforeAll(() => {
  vi.stubGlobal("window", fakeWindow);
  vi.stubGlobal("document", fakeDocument);
});

beforeEach(() => {
  storage.clear();
  docState.attrs.clear();
  docState.styles.clear();
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("prefs store", () => {
  it("hydrates with defaults when storage is empty", async () => {
    const { usePrefsStore } = await import("../store");
    usePrefsStore.getState().hydrate();
    const s = usePrefsStore.getState();
    expect(s.hydrated).toBe(true);
    expect(s.fontScale).toBe(1);
    expect(s.dockPos).toBe("left");
    expect(docState.styles.get("--font-scale")).toBe("1");
    expect(docState.attrs.get("data-dock-pos")).toBe("left");
  });

  it("hydrates from persisted values", async () => {
    storage.set(FONT_SCALE_KEY, "1.2");
    storage.set(DOCK_POS_KEY, "right");
    const { usePrefsStore } = await import("../store");
    usePrefsStore.getState().hydrate();
    const s = usePrefsStore.getState();
    expect(s.fontScale).toBe(1.2);
    expect(s.dockPos).toBe("right");
  });

  it("clamps font scale within bounds", async () => {
    const { usePrefsStore } = await import("../store");
    usePrefsStore.getState().setFontScale(99);
    expect(usePrefsStore.getState().fontScale).toBe(1.4);
    usePrefsStore.getState().setFontScale(0.1);
    expect(usePrefsStore.getState().fontScale).toBe(0.85);
  });

  it("setFontScale persists and applies to DOM", async () => {
    const { usePrefsStore } = await import("../store");
    usePrefsStore.getState().setFontScale(1.15);
    expect(storage.get(FONT_SCALE_KEY)).toBe("1.15");
    expect(docState.styles.get("--font-scale")).toBe("1.15");
  });

  it("setDockPos persists and applies to DOM", async () => {
    const { usePrefsStore } = await import("../store");
    usePrefsStore.getState().setDockPos("right");
    expect(storage.get(DOCK_POS_KEY)).toBe("right");
    expect(docState.attrs.get("data-dock-pos")).toBe("right");
  });

  it("ignores invalid stored font scale", async () => {
    storage.set(FONT_SCALE_KEY, "not-a-number");
    const { usePrefsStore } = await import("../store");
    usePrefsStore.getState().hydrate();
    expect(usePrefsStore.getState().fontScale).toBe(1);
  });

  it("treats invalid dock position as left", async () => {
    storage.set(DOCK_POS_KEY, "elsewhere");
    const { usePrefsStore } = await import("../store");
    usePrefsStore.getState().hydrate();
    expect(usePrefsStore.getState().dockPos).toBe("left");
  });

  it("migrates legacy lens.prefs.sidebarPos to lens.prefs.dockPos on hydrate", async () => {
    storage.set(LEGACY_SIDEBAR_POS_KEY, "right");
    const { usePrefsStore } = await import("../store");
    usePrefsStore.getState().hydrate();
    expect(usePrefsStore.getState().dockPos).toBe("right");
    expect(storage.get(DOCK_POS_KEY)).toBe("right");
    expect(storage.has(LEGACY_SIDEBAR_POS_KEY)).toBe(false);
  });

  it("prefers the new key over the legacy key when both exist", async () => {
    storage.set(LEGACY_SIDEBAR_POS_KEY, "right");
    storage.set(DOCK_POS_KEY, "left");
    const { usePrefsStore } = await import("../store");
    usePrefsStore.getState().hydrate();
    expect(usePrefsStore.getState().dockPos).toBe("left");
    // legacy is left intact when the new key already exists — no migration needed
    expect(storage.get(LEGACY_SIDEBAR_POS_KEY)).toBe("right");
  });
});
