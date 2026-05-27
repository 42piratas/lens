import { describe, expect, it } from "vitest";
import {
  PAYLOAD_MIME,
  dragPayloadSchema,
  emitPayload,
  parseDragPayload,
} from "..";

class MockDataTransfer implements Pick<DataTransfer, "setData" | "getData" | "effectAllowed"> {
  private bag = new Map<string, string>();
  effectAllowed: DataTransfer["effectAllowed"] = "uninitialized";
  setData(format: string, data: string): void {
    this.bag.set(format, data);
  }
  getData(format: string): string {
    return this.bag.get(format) ?? "";
  }
}

describe("dnd-payloads — schema", () => {
  it("accepts a minimal tag-like payload", () => {
    const r = dragPayloadSchema.safeParse({ kind: "tag-like", name: "OKR1" });
    expect(r.success).toBe(true);
  });

  it("accepts a full tag-like payload with source", () => {
    const r = dragPayloadSchema.safeParse({
      kind: "tag-like",
      name: "OKR1",
      description: "Ship Phase 2",
      color: "purple",
      source: { connector: "google-sheets", sourceId: "row-3" },
    });
    expect(r.success).toBe(true);
  });

  it("rejects an unknown kind", () => {
    const r = dragPayloadSchema.safeParse({ kind: "media-item", name: "x" });
    expect(r.success).toBe(false);
  });

  it("rejects an empty name", () => {
    const r = dragPayloadSchema.safeParse({ kind: "tag-like", name: "" });
    expect(r.success).toBe(false);
  });

  it("rejects a missing kind", () => {
    const r = dragPayloadSchema.safeParse({ name: "x" });
    expect(r.success).toBe(false);
  });

  it("accepts a minimal clip-like payload (originalContent required)", () => {
    const r = dragPayloadSchema.safeParse({
      kind: "clip-like",
      label: "Standup",
      source: { connector: "google-calendar", sourceId: "evt_123" },
      originalContent: "agenda",
    });
    expect(r.success).toBe(true);
  });

  it("accepts a clip-like payload with parentTitle, href, meta", () => {
    const r = dragPayloadSchema.safeParse({
      kind: "clip-like",
      label: "Card title",
      source: { connector: "trello", sourceId: "card_abc" },
      parentTitle: "NOOOW!",
      originalContent: "card body",
      href: "https://trello.com/c/abc",
      meta: { calendarId: "primary" },
    });
    expect(r.success).toBe(true);
  });

  it("rejects a clip-like payload missing originalContent", () => {
    const r = dragPayloadSchema.safeParse({
      kind: "clip-like",
      label: "x",
      source: { connector: "trello", sourceId: "abc" },
    });
    expect(r.success).toBe(false);
  });

  it("rejects a clip-like payload without source.connector", () => {
    const r = dragPayloadSchema.safeParse({
      kind: "clip-like",
      label: "x",
      source: { sourceId: "abc" },
      originalContent: "",
    });
    expect(r.success).toBe(false);
  });

  it("rejects a clip-like payload without source.sourceId", () => {
    const r = dragPayloadSchema.safeParse({
      kind: "clip-like",
      label: "x",
      source: { connector: "trello" },
      originalContent: "",
    });
    expect(r.success).toBe(false);
  });

  it("rejects a clip-like payload with empty label", () => {
    const r = dragPayloadSchema.safeParse({
      kind: "clip-like",
      label: "",
      source: { connector: "trello", sourceId: "abc" },
      originalContent: "",
    });
    expect(r.success).toBe(false);
  });

  it("accepts a minimal note-like payload (body required)", () => {
    const r = dragPayloadSchema.safeParse({
      kind: "note-like",
      body: "Quick reminder",
    });
    expect(r.success).toBe(true);
  });

  it("accepts a full note-like payload with title + source", () => {
    const r = dragPayloadSchema.safeParse({
      kind: "note-like",
      title: "Standup notes",
      body: "Decided to ship Friday",
      source: { connector: "scratchpad", sourceId: "buf-1" },
    });
    expect(r.success).toBe(true);
  });

  it("rejects a note-like payload with empty body", () => {
    const r = dragPayloadSchema.safeParse({ kind: "note-like", body: "" });
    expect(r.success).toBe(false);
  });
});

describe("dnd-payloads — emit/parse round-trip", () => {
  it("round-trips a payload through DataTransfer", () => {
    const dt = new MockDataTransfer() as unknown as DataTransfer;
    const payload = {
      kind: "tag-like" as const,
      name: "OKR1",
      description: "Ship Phase 2",
      color: "purple",
    };
    emitPayload(dt, payload);
    const out = parseDragPayload(dt);
    expect(out).toEqual(payload);
  });

  it("sets the canonical MIME type", () => {
    const dt = new MockDataTransfer() as unknown as DataTransfer;
    emitPayload(dt, { kind: "tag-like", name: "OKR1" });
    expect(dt.getData(PAYLOAD_MIME)).toContain("OKR1");
  });

  it("sets a plain-text fallback for foreign drop targets", () => {
    const dt = new MockDataTransfer() as unknown as DataTransfer;
    emitPayload(dt, { kind: "tag-like", name: "OKR1" });
    expect(dt.getData("text/plain")).toBe("OKR1");
  });

  it("returns null when the MIME slot is empty", () => {
    const dt = new MockDataTransfer() as unknown as DataTransfer;
    expect(parseDragPayload(dt)).toBeNull();
  });

  it("returns null when the JSON is malformed", () => {
    const dt = new MockDataTransfer() as unknown as DataTransfer;
    dt.setData(PAYLOAD_MIME, "{not-json");
    expect(parseDragPayload(dt)).toBeNull();
  });

  it("returns null when the shape fails Zod validation", () => {
    const dt = new MockDataTransfer() as unknown as DataTransfer;
    dt.setData(PAYLOAD_MIME, JSON.stringify({ kind: "wrong" }));
    expect(parseDragPayload(dt)).toBeNull();
  });

  it("returns null when transfer is null/undefined", () => {
    expect(parseDragPayload(null)).toBeNull();
    expect(parseDragPayload(undefined)).toBeNull();
  });

  it("round-trips a clip-like payload", () => {
    const dt = new MockDataTransfer() as unknown as DataTransfer;
    const payload = {
      kind: "clip-like" as const,
      label: "Standup",
      source: { connector: "google-calendar", sourceId: "evt_123" },
      parentTitle: "CALENDAR",
      originalContent: "agenda",
      href: "https://calendar.google.com/calendar/event?eid=evt_123",
      meta: { calendarId: "primary" },
    };
    emitPayload(dt, payload);
    const out = parseDragPayload(dt);
    expect(out).toEqual(payload);
  });

  it("uses the clip label as plain-text fallback for clip-like", () => {
    const dt = new MockDataTransfer() as unknown as DataTransfer;
    emitPayload(dt, {
      kind: "clip-like",
      label: "Refactor reflow",
      source: { connector: "trello", sourceId: "abc" },
      originalContent: "",
    });
    expect(dt.getData("text/plain")).toBe("Refactor reflow");
  });

  it("round-trips a note-like payload", () => {
    const dt = new MockDataTransfer() as unknown as DataTransfer;
    const payload = {
      kind: "note-like" as const,
      title: "Standup notes",
      body: "Decided to ship Friday",
      source: { connector: "scratchpad", sourceId: "buf-1" },
    };
    emitPayload(dt, payload);
    const out = parseDragPayload(dt);
    expect(out).toEqual(payload);
  });

  it("uses the title as plain-text fallback for note-like, body if no title", () => {
    const dt1 = new MockDataTransfer() as unknown as DataTransfer;
    emitPayload(dt1, { kind: "note-like", title: "T", body: "B" });
    expect(dt1.getData("text/plain")).toBe("T");
    const dt2 = new MockDataTransfer() as unknown as DataTransfer;
    emitPayload(dt2, { kind: "note-like", body: "Body only" });
    expect(dt2.getData("text/plain")).toBe("Body only");
  });
});
