import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clipLikeAdapter } from "@/connectors/scratchpad/payload-adapters/clip-like";
import { readScratchpad } from "@/connectors/scratchpad/client";
import type { LayoutCard } from "@/connectors/types";
import type { ClipLikePayload, TagLikePayload } from "@/lib/dnd-payloads/types";
import type { ScratchpadConfig } from "@/connectors/scratchpad/manifest";

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) { return this.store.get(k) ?? null; }
  setItem(k: string, v: string) { this.store.set(k, v); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
  key(i: number) { return Array.from(this.store.keys())[i] ?? null; }
  get length() { return this.store.size; }
}

const card: LayoutCard<ScratchpadConfig> = {
  id: "card-1",
  connector: "scratchpad",
  tile: "note-buffer",
  x: 0,
  y: 0,
  w: 4,
  h: 4,
  config: {},
};

const clip = (overrides: Partial<ClipLikePayload> = {}): ClipLikePayload => ({
  kind: "clip-like",
  label: "Standup",
  source: { connector: "google-calendar", sourceId: "evt-1" },
  originalContent: "agenda",
  ...overrides,
});

describe("scratchpad payloadAdapters['clip-like'] (v2 — binding)", () => {
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

  it("canAccept rejects non-clip-like payloads", () => {
    const tag: TagLikePayload = { kind: "tag-like", name: "Bug" };
    expect(clipLikeAdapter.canAccept(card, tag as never)).toBe(false);
  });

  it("canAccept rejects clip-like with empty label", () => {
    expect(clipLikeAdapter.canAccept(card, clip({ label: "" }))).toBe(false);
  });

  it("canAccept rejects clip-like with missing source.sourceId", () => {
    const malformed = clip({ source: { connector: "x", sourceId: "" } });
    expect(clipLikeAdapter.canAccept(card, malformed)).toBe(false);
  });

  it("canAccept accepts a valid clip-like", () => {
    expect(clipLikeAdapter.canAccept(card, clip())).toBe(true);
  });

  it("onAccept binds the source and seeds content from originalContent", async () => {
    const out = await clipLikeAdapter.onAccept(card, clip({ originalContent: "Plan day" }));
    expect(out).toEqual({ ok: true });
    const state = readScratchpad();
    expect(state.binding).toMatchObject({
      connector: "google-calendar",
      sourceId: "evt-1",
      sourceTitle: "Standup",
      originalContent: "Plan day",
    });
    expect(state.content).toBe("Plan day");
  });

  it("onAccept overwrites the prior binding (single-active-doc model)", async () => {
    await clipLikeAdapter.onAccept(card, clip({ source: { connector: "trello", sourceId: "a" }, originalContent: "A" }));
    await clipLikeAdapter.onAccept(card, clip({ source: { connector: "trello", sourceId: "b" }, originalContent: "B" }));
    const state = readScratchpad();
    expect(state.binding?.sourceId).toBe("b");
    expect(state.content).toBe("B");
  });
});
