import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  STORAGE_KEY,
  clearBinding,
  isBound,
  readScratchpad,
  setBinding,
  updateContent,
} from "@/connectors/scratchpad/client";
import {
  SCRATCHPAD_SCHEMA_VERSION,
  type BoundSource,
} from "@/connectors/scratchpad/types";

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) { return this.store.get(k) ?? null; }
  setItem(k: string, v: string) { this.store.set(k, v); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
  key(i: number) { return Array.from(this.store.keys())[i] ?? null; }
  get length() { return this.store.size; }
}

const sampleBinding = (overrides: Partial<BoundSource> = {}): BoundSource => ({
  connector: "trello",
  sourceId: "card-1",
  sourceTitle: "LENS",
  parentTitle: "NOOOW!",
  originalContent: "initial body",
  ...overrides,
});

describe("scratchpad client (v2 — single binding)", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage: storage },
    });
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("readScratchpad returns empty state when storage is empty", () => {
    expect(readScratchpad()).toEqual({
      version: SCRATCHPAD_SCHEMA_VERSION,
      binding: null,
      content: "",
    });
  });

  it("setBinding persists binding + seeds content from originalContent", () => {
    setBinding(sampleBinding());
    const persisted = JSON.parse(storage.getItem(STORAGE_KEY)!);
    expect(persisted.version).toBe(SCRATCHPAD_SCHEMA_VERSION);
    expect(persisted.binding.connector).toBe("trello");
    expect(persisted.binding.sourceId).toBe("card-1");
    expect(persisted.content).toBe("initial body");
  });

  it("setBinding overwrites prior binding (single-active-doc model)", () => {
    setBinding(sampleBinding({ sourceId: "a", originalContent: "A" }));
    setBinding(sampleBinding({ sourceId: "b", originalContent: "B" }));
    const state = readScratchpad();
    expect(state.binding?.sourceId).toBe("b");
    expect(state.content).toBe("B");
  });

  it("updateContent mutates content but preserves binding", () => {
    setBinding(sampleBinding());
    updateContent("edited");
    const state = readScratchpad();
    expect(state.binding?.sourceId).toBe("card-1");
    expect(state.content).toBe("edited");
  });

  it("clearBinding wipes the binding back to empty state", () => {
    setBinding(sampleBinding());
    updateContent("edited");
    clearBinding();
    const state = readScratchpad();
    expect(state.binding).toBeNull();
    expect(state.content).toBe("");
  });

  it("isBound matches the active binding only", () => {
    setBinding(sampleBinding());
    expect(isBound("trello", "card-1")).toBe(true);
    expect(isBound("trello", "card-2")).toBe(false);
    expect(isBound("google-calendar", "card-1")).toBe(false);
  });

  it("readScratchpad returns empty state on v1 (legacy) data — wipe-on-migrate", () => {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, items: [{ id: "x", connector: "trello", sourceId: "y", label: "z", addedAt: "now" }] }),
    );
    const state = readScratchpad();
    expect(state.binding).toBeNull();
    expect(state.content).toBe("");
  });

  it("readScratchpad returns empty state on malformed JSON", () => {
    storage.setItem(STORAGE_KEY, "not json {");
    expect(readScratchpad().binding).toBeNull();
  });
});
