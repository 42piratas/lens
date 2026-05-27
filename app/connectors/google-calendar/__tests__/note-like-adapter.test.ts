import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { noteLikeAdapter } from "@/connectors/google-calendar/payload-adapters/note-like";
import type { LayoutCard } from "@/connectors/types";
import type { GoogleCalendarConfig } from "@/connectors/google-calendar/manifest";
import type { NoteLikePayload } from "@/lib/dnd-payloads/types";
import { noteEnvelope } from "@/lib/dnd-payloads/note-envelope";

const card: LayoutCard<GoogleCalendarConfig> = {
  id: "card-1",
  connector: "google-calendar",
  tile: "calendar-one-week",
  x: 0,
  y: 0,
  w: 4,
  h: 4,
  config: { calendarIds: ["primary"] },
};

const note = (overrides: Partial<NoteLikePayload> = {}): NoteLikePayload => ({
  kind: "note-like",
  title: "Standup",
  body: "Decided to ship Friday",
  source: { connector: "scratchpad", sourceId: "buf-1" },
  ...overrides,
});

describe("calendar note-like adapter — description-append", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("canAcceptTarget requires both target.id and target.meta.calendarId", () => {
    expect(noteLikeAdapter.canAcceptTarget!(card, note(), { id: "" })).toBe(false);
    expect(noteLikeAdapter.canAcceptTarget!(card, note(), { id: "evt-1" })).toBe(false);
    expect(
      noteLikeAdapter.canAcceptTarget!(card, note(), {
        id: "evt-1",
        meta: { calendarId: "primary" },
      }),
    ).toBe(true);
  });

  it("onAccept PATCHes events with descriptionAppend = noteEnvelope(payload)", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ event: { id: "evt-1" } }), { status: 200 }),
    );
    const out = await noteLikeAdapter.onAccept(card, note(), {
      id: "evt-1",
      meta: { calendarId: "primary" },
    });
    expect(out).toEqual({ ok: true });
    const args = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(args[0]).toBe("/api/google/calendar/events");
    expect(args[1].method).toBe("PATCH");
    const body = JSON.parse(args[1].body);
    expect(body).toEqual({
      calendarId: "primary",
      eventId: "evt-1",
      descriptionAppend: noteEnvelope(note()),
    });
  });

  it("returns ok:false on missing calendarId", async () => {
    const out = await noteLikeAdapter.onAccept(card, note(), { id: "evt-1" });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toContain("calendarId");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns ok:false on missing target.id", async () => {
    const out = await noteLikeAdapter.onAccept(card, note(), {
      id: "",
      meta: { calendarId: "primary" },
    });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toContain("target.id");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("surfaces auth failures with status in reason", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({ error: { kind: "auth", message: "Calendar API 401" } }),
        { status: 401 },
      ),
    );
    const out = await noteLikeAdapter.onAccept(card, note(), {
      id: "evt-1",
      meta: { calendarId: "primary" },
    });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toContain("401");
  });
});
