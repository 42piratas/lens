import { describe, expect, it } from "vitest";
import { getConnector, getConnectors } from "@/connectors";
import { dragPayloadSchema } from "@/lib/dnd-payloads";

/**
 * Cross-connector contract for `payloadAdapters`. Mirrors the tile-adapter
 * contract test: every adapter key must reference a registered payload
 * kind, and the canAccept/onAccept (and optional onSourceRemoved) shapes
 * must match the type signature.
 */

describe("payload adapter contract", () => {
  it("every payloadAdapters key matches a registered DragPayload kind", () => {
    const knownKinds = new Set<string>(
      dragPayloadSchema.options.map((o) => o.shape.kind.value),
    );
    for (const c of getConnectors()) {
      const adapterKeys = Object.keys(c.payloadAdapters ?? {});
      for (const kind of adapterKeys) {
        expect(
          knownKinds.has(kind),
          `connector "${c.id}" registers adapter for unknown payload kind "${kind}"`,
        ).toBe(true);
      }
    }
  });

  it("every adapter exposes label + canAccept + onAccept as functions/strings", () => {
    for (const c of getConnectors()) {
      for (const [kind, adapter] of Object.entries(c.payloadAdapters ?? {})) {
        expect(
          typeof adapter.label,
          `${c.id} adapter for "${kind}" missing label`,
        ).toBe("string");
        expect(
          typeof adapter.canAccept,
          `${c.id} adapter for "${kind}" missing canAccept`,
        ).toBe("function");
        expect(
          typeof adapter.onAccept,
          `${c.id} adapter for "${kind}" missing onAccept`,
        ).toBe("function");
        if (adapter.onContentEdited !== undefined) {
          expect(
            typeof adapter.onContentEdited,
            `${c.id} adapter for "${kind}" has malformed onContentEdited`,
          ).toBe("function");
        }
      }
    }
  });

  it("Trello + Calendar register the tag-like adapter", () => {
    const trello = getConnectors().find((c) => c.id === "trello");
    const calendar = getConnectors().find((c) => c.id === "google-calendar");
    expect(trello?.payloadAdapters?.["tag-like"]).toBeDefined();
    expect(calendar?.payloadAdapters?.["tag-like"]).toBeDefined();
  });

  it("Trello payload-adapter canAccept gates on boardId", () => {
    const trello = getConnectors().find((c) => c.id === "trello");
    const adapter = trello?.payloadAdapters?.["tag-like"];
    expect(adapter).toBeDefined();
    const cardWithBoard = {
      id: "c1",
      connector: "trello",
      tile: "kanban-board",
      x: 0,
      y: 0,
      w: 4,
      h: 4,
      config: { boardId: "b1" },
    };
    const cardWithoutBoard = { ...cardWithBoard, config: {} };
    const payload = { kind: "tag-like" as const, name: "OKR1" };
    expect(adapter!.canAccept(cardWithBoard, payload)).toBe(true);
    expect(adapter!.canAccept(cardWithoutBoard, payload)).toBe(false);
  });

  it("Scratchpad registers the clip-like adapter (absorber)", () => {
    const scratchpad = getConnectors().find((c) => c.id === "scratchpad");
    const adapter = scratchpad?.payloadAdapters?.["clip-like"];
    expect(adapter).toBeDefined();
    expect(adapter!.onContentEdited).toBeUndefined();
    const card = {
      id: "c1",
      connector: "scratchpad",
      tile: "note-buffer",
      x: 0,
      y: 0,
      w: 4,
      h: 4,
      config: {},
    };
    const goodClip = {
      kind: "clip-like" as const,
      label: "Standup",
      source: { connector: "google-calendar", sourceId: "evt-1" },
      originalContent: "agenda",
    };
    expect(adapter!.canAccept(card, goodClip)).toBe(true);
  });

  it("Trello registers the clip-like adapter with onContentEdited (round-trip)", () => {
    const trello = getConnectors().find((c) => c.id === "trello");
    const adapter = trello?.payloadAdapters?.["clip-like"];
    expect(adapter).toBeDefined();
    expect(typeof adapter!.onContentEdited).toBe("function");
    const card = {
      id: "c1",
      connector: "trello",
      tile: "kanban-board",
      x: 0,
      y: 0,
      w: 4,
      h: 4,
      config: { boardId: "b1" },
    };
    const clip = {
      kind: "clip-like" as const,
      label: "x",
      source: { connector: "trello", sourceId: "card-1" },
      originalContent: "body",
    };
    expect(adapter!.canAccept(card, clip)).toBe(false);
  });

  it("Calendar registers the clip-like adapter with onContentEdited (round-trip)", () => {
    const calendar = getConnectors().find((c) => c.id === "google-calendar");
    const adapter = calendar?.payloadAdapters?.["clip-like"];
    expect(adapter).toBeDefined();
    expect(typeof adapter!.onContentEdited).toBe("function");
  });

  it("read-only producers (Sheets, Tasks, Goodreads, Trakt) omit clip-like adapters", () => {
    const readOnly = ["google-sheets", "google-tasks", "goodreads", "trakt"];
    for (const id of readOnly) {
      const c = getConnectors().find((x) => x.id === id);
      expect(c?.payloadAdapters?.["clip-like"]).toBeUndefined();
    }
  });

  it("Trello + Calendar register the note-like adapter (b02-09 — single behavior, description-append)", () => {
    const trello = getConnectors().find((c) => c.id === "trello");
    const calendar = getConnectors().find((c) => c.id === "google-calendar");
    expect(trello?.payloadAdapters?.["note-like"]).toBeDefined();
    expect(calendar?.payloadAdapters?.["note-like"]).toBeDefined();
  });

  it("note-like adapters require a per-row target (canAcceptTarget)", () => {
    const trello = getConnectors().find((c) => c.id === "trello");
    const calendar = getConnectors().find((c) => c.id === "google-calendar");
    const trelloNote = trello?.payloadAdapters?.["note-like"];
    const calendarNote = calendar?.payloadAdapters?.["note-like"];
    expect(trelloNote).toBeDefined();
    expect(calendarNote).toBeDefined();
    if (!trelloNote || !calendarNote) return;
    const trelloCard = {
      id: "c1",
      connector: "trello",
      tile: "kanban-board",
      x: 0, y: 0, w: 4, h: 4,
      config: { boardId: "b1" },
    };
    const calendarCard = {
      id: "c2",
      connector: "google-calendar",
      tile: "calendar-one-day",
      x: 0, y: 0, w: 4, h: 4,
      config: { calendarIds: ["primary"] },
    };
    const payload = {
      kind: "note-like" as const,
      title: "Standup",
      body: "Decided to ship Friday",
    };
    expect(trelloNote.canAccept(trelloCard, payload)).toBe(true);
    expect(trelloNote.canAcceptTarget?.(trelloCard, payload, { id: "" })).toBe(false);
    expect(trelloNote.canAcceptTarget?.(trelloCard, payload, { id: "card-x" })).toBe(true);
    expect(calendarNote.canAcceptTarget?.(calendarCard, payload, { id: "evt-1" })).toBe(false);
    expect(
      calendarNote.canAcceptTarget?.(calendarCard, payload, {
        id: "evt-1",
        meta: { calendarId: "primary" },
      }),
    ).toBe(true);
  });

  it("Calendar payload-adapter canAccept gates on calendarIds (any calendar tile)", () => {
    const calendar = getConnectors().find((c) => c.id === "google-calendar");
    const adapter = calendar?.payloadAdapters?.["tag-like"];
    expect(adapter).toBeDefined();
    const oneDayCard = {
      id: "c1",
      connector: "google-calendar",
      tile: "calendar-one-day",
      x: 0,
      y: 0,
      w: 4,
      h: 4,
      config: { calendarIds: ["primary"] },
    };
    const weekCard = { ...oneDayCard, tile: "calendar-one-week" };
    const macroCard = { ...oneDayCard, tile: "calendar-many-weeks" };
    const oneDayUnconfigured = { ...oneDayCard, config: {} };
    const payload = { kind: "tag-like" as const, name: "OKR1" };
    expect(adapter!.canAccept(oneDayCard, payload)).toBe(true);
    expect(adapter!.canAccept(weekCard, payload)).toBe(true);
    expect(adapter!.canAccept(macroCard, payload)).toBe(true);
    expect(adapter!.canAccept(oneDayUnconfigured, payload)).toBe(false);
  });
});

describe("payload adapter contract — Keep is read-only (no payload adapters)", () => {
  // b02-12 dropped Keep's tag-like + note-like adapters along with the
  // sidecar's write surface — the Keep REST API v1 is read-only by design
  // (D4 in b02-12 block spec).
  it("Keep does not register any payload adapters", () => {
    const keep = getConnector("keep");
    expect(keep?.payloadAdapters).toBeUndefined();
  });
});
