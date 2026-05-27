import { describe, expect, it } from "vitest";
import { buildClipEditWriteback } from "@/tiles/note-buffer/component";
import type { BoundSource } from "@/connectors/scratchpad/types";

const binding: BoundSource = {
  connector: "trello",
  sourceId: "tcard-1",
  sourceTitle: "Refactor reflow",
  parentTitle: "NOOOW!",
  originalContent: "old body",
  href: "https://trello.com/c/abc",
  meta: undefined,
};

describe("note-buffer buildClipEditWriteback (blur write-back decision)", () => {
  it("returns null when source is read-only (no onContentEdited adapter)", () => {
    const out = buildClipEditWriteback({
      binding,
      draft: "new body",
      writable: false,
      findCardByConnector: () => ({ id: "card-1" }),
    });
    expect(out).toBeNull();
  });

  it("returns null when no live card matches the binding's connector", () => {
    const out = buildClipEditWriteback({
      binding,
      draft: "new body",
      writable: true,
      findCardByConnector: () => undefined,
    });
    expect(out).toBeNull();
  });

  it("returns a clip-edit entry carrying draft as originalContent + binding identity", () => {
    const out = buildClipEditWriteback({
      binding,
      draft: "new body",
      writable: true,
      findCardByConnector: (c) =>
        c === "trello" ? { id: "card-1" } : undefined,
    });
    expect(out).not.toBeNull();
    expect(out!.kind).toBe("clip-edit");
    expect(out!.cardId).toBe("card-1");
    expect(out!.payload.kind).toBe("clip-like");
    expect(out!.payload.source).toEqual({ connector: "trello", sourceId: "tcard-1" });
    expect(out!.payload.label).toBe("Refactor reflow");
    expect(out!.payload.parentTitle).toBe("NOOOW!");
    expect(out!.payload.originalContent).toBe("new body");
    expect(out!.payload.href).toBe("https://trello.com/c/abc");
  });

  it("threads meta through (used for Calendar's calendarId routing)", () => {
    const calBinding: BoundSource = {
      connector: "google-calendar",
      sourceId: "evt_abc",
      sourceTitle: "Standup",
      parentTitle: "CALENDAR",
      originalContent: "agenda",
      meta: { calendarId: "primary" },
    };
    const out = buildClipEditWriteback({
      binding: calBinding,
      draft: "agenda v2",
      writable: true,
      findCardByConnector: () => ({ id: "card-cal" }),
    });
    expect(out).not.toBeNull();
    expect(out!.payload.meta).toEqual({ calendarId: "primary" });
  });

  it("uses the live card's id (not the binding's sourceId) as cardId", () => {
    const out = buildClipEditWriteback({
      binding,
      draft: "new body",
      writable: true,
      findCardByConnector: () => ({ id: "live-card-7" }),
    });
    expect(out!.cardId).toBe("live-card-7");
    // sourceId stays in payload.source for the adapter to address the upstream resource.
    expect(out!.payload.source.sourceId).toBe("tcard-1");
  });
});
