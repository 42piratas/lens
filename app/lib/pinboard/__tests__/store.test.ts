import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const STORAGE_KEY = "lens.pinboard";

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) { return this.store.get(k) ?? null; }
  setItem(k: string, v: string) { this.store.set(k, v); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
  key(i: number) { return Array.from(this.store.keys())[i] ?? null; }
  get length() { return this.store.size; }
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  vi.stubGlobal("window", { localStorage: storage });
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("pinboard store", () => {
  it("hydrates to empty state when storage is empty", async () => {
    const { usePinboardStore } = await import("../store");
    usePinboardStore.getState().hydrate();
    const s = usePinboardStore.getState();
    expect(s.hydrated).toBe(true);
    expect(s.enabled).toBe(false);
    expect(s.pins).toEqual([]);
  });

  it("hydrates from persisted state", async () => {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        enabled: true,
        pins: [
          { id: "p1", label: "A", url: "https://a.example.com", icon: "", order: 0 },
          { id: "p2", label: "B", url: "https://b.example.com", icon: "globe", order: 1 },
        ],
      }),
    );
    const { usePinboardStore } = await import("../store");
    usePinboardStore.getState().hydrate();
    const s = usePinboardStore.getState();
    expect(s.enabled).toBe(true);
    expect(s.pins.map((p) => p.id)).toEqual(["p1", "p2"]);
  });

  it("setEnabled persists", async () => {
    const { usePinboardStore } = await import("../store");
    usePinboardStore.getState().hydrate();
    usePinboardStore.getState().setEnabled(true);
    const raw = JSON.parse(storage.getItem(STORAGE_KEY)!);
    expect(raw.enabled).toBe(true);
  });

  it("addPin rejects invalid URLs", async () => {
    const { usePinboardStore } = await import("../store");
    usePinboardStore.getState().hydrate();
    const id = usePinboardStore.getState().addPin({ label: "X", url: "not-a-url" });
    expect(id).toBeNull();
    expect(usePinboardStore.getState().pins).toHaveLength(0);
  });

  it("addPin auto-fills empty label from host", async () => {
    const { usePinboardStore } = await import("../store");
    usePinboardStore.getState().hydrate();
    const id = usePinboardStore.getState().addPin({ label: "", url: "https://claude.ai/path" });
    expect(id).not.toBeNull();
    const pin = usePinboardStore.getState().pins[0]!;
    expect(pin.label).toBe("claude.ai");
    expect(pin.url).toBe("https://claude.ai/path");
    expect(pin.order).toBe(0);
  });

  it("addPin appends with order = end-of-list", async () => {
    const { usePinboardStore } = await import("../store");
    usePinboardStore.getState().hydrate();
    usePinboardStore.getState().addPin({ label: "1", url: "https://a.com" });
    usePinboardStore.getState().addPin({ label: "2", url: "https://b.com" });
    usePinboardStore.getState().addPin({ label: "3", url: "https://c.com" });
    const orders = usePinboardStore.getState().pins.map((p) => p.order);
    expect(orders).toEqual([0, 1, 2]);
  });

  it("removePin rewrites the order field 0..N-1", async () => {
    const { usePinboardStore } = await import("../store");
    usePinboardStore.getState().hydrate();
    const a = usePinboardStore.getState().addPin({ label: "A", url: "https://a.com" })!;
    const b = usePinboardStore.getState().addPin({ label: "B", url: "https://b.com" })!;
    const c = usePinboardStore.getState().addPin({ label: "C", url: "https://c.com" })!;
    usePinboardStore.getState().removePin(b);
    const pins = usePinboardStore.getState().pins;
    expect(pins.map((p) => p.id)).toEqual([a, c]);
    expect(pins.map((p) => p.order)).toEqual([0, 1]);
  });

  it("updatePin patches label + url + icon and re-validates URL", async () => {
    const { usePinboardStore } = await import("../store");
    usePinboardStore.getState().hydrate();
    const id = usePinboardStore.getState().addPin({ label: "X", url: "https://x.com" })!;
    usePinboardStore.getState().updatePin(id, { label: "X2", url: "https://x2.com", icon: "globe" });
    const pin = usePinboardStore.getState().pins[0]!;
    expect(pin.label).toBe("X2");
    expect(pin.url).toBe("https://x2.com");
    expect(pin.icon).toBe("globe");
  });

  it("updatePin rejects invalid url (no-op)", async () => {
    const { usePinboardStore } = await import("../store");
    usePinboardStore.getState().hydrate();
    const id = usePinboardStore.getState().addPin({ label: "X", url: "https://x.com" })!;
    usePinboardStore.getState().updatePin(id, { url: "javascript:alert(1)" });
    expect(usePinboardStore.getState().pins[0]!.url).toBe("https://x.com");
  });

  it("reorderPins rewrites order to match ids array (AC-7)", async () => {
    const { usePinboardStore } = await import("../store");
    usePinboardStore.getState().hydrate();
    const a = usePinboardStore.getState().addPin({ label: "A", url: "https://a.com" })!;
    const b = usePinboardStore.getState().addPin({ label: "B", url: "https://b.com" })!;
    const c = usePinboardStore.getState().addPin({ label: "C", url: "https://c.com" })!;
    usePinboardStore.getState().reorderPins([c, a, b]);
    const pins = usePinboardStore.getState().pins;
    expect(pins.map((p) => p.id)).toEqual([c, a, b]);
    expect(pins.map((p) => p.order)).toEqual([0, 1, 2]);
    // Persisted with new order
    const raw = JSON.parse(storage.getItem(STORAGE_KEY)!);
    expect(raw.pins.map((p: { id: string }) => p.id)).toEqual([c, a, b]);
  });

  it("disabling does not lose pins", async () => {
    const { usePinboardStore } = await import("../store");
    usePinboardStore.getState().hydrate();
    usePinboardStore.getState().addPin({ label: "Keep me", url: "https://keep.com" });
    usePinboardStore.getState().setEnabled(true);
    usePinboardStore.getState().setEnabled(false);
    expect(usePinboardStore.getState().pins).toHaveLength(1);
    expect(usePinboardStore.getState().enabled).toBe(false);
  });
});
