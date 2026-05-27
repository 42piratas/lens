import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clipLikeAdapter } from "@/connectors/google-calendar/payload-adapters/clip-like";
import type { LayoutCard } from "@/connectors/types";
import type { GoogleCalendarConfig } from "@/connectors/google-calendar/manifest";
import type { ClipLikePayload } from "@/lib/dnd-payloads/types";

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

const clip = (overrides: Partial<ClipLikePayload> = {}): ClipLikePayload => ({
  kind: "clip-like",
  label: "Standup",
  source: { connector: "google-calendar", sourceId: "evt_abc" },
  originalContent: "edited body",
  parentTitle: "CALENDAR",
  meta: { calendarId: "primary" },
  ...overrides,
});

describe("calendar clip-like payload adapter (v2 — onContentEdited)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("canAccept always returns false (Calendar does not absorb clips)", () => {
    expect(clipLikeAdapter.canAccept(card, clip())).toBe(false);
  });

  it("onAccept rejects (Calendar is the source, not the target)", async () => {
    const out = await clipLikeAdapter.onAccept(card, clip());
    expect(out.ok).toBe(false);
  });

  it("onContentEdited PATCHes /api/google/calendar/events with description + ids", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ event: { id: "evt_abc" } }), { status: 200 }),
    );
    const out = await clipLikeAdapter.onContentEdited!(
      card,
      clip({ originalContent: "new body" }),
    );
    expect(out).toEqual({ ok: true });
    const args = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(args[0]).toBe("/api/google/calendar/events");
    expect((args[1] as RequestInit).method).toBe("PATCH");
    const body = JSON.parse((args[1] as RequestInit).body as string);
    expect(body).toEqual({
      calendarId: "primary",
      eventId: "evt_abc",
      description: "new body",
    });
  });

  it("onContentEdited returns ok:false when meta.calendarId is missing", async () => {
    const out = await clipLikeAdapter.onContentEdited!(
      card,
      clip({ meta: undefined }),
    );
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toContain("calendarId");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("onContentEdited returns ok:false when source.sourceId is empty", async () => {
    const out = await clipLikeAdapter.onContentEdited!(
      card,
      clip({ source: { connector: "google-calendar", sourceId: "  " } }),
    );
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toContain("sourceId");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("onContentEdited surfaces 401 with status in reason", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({ error: { kind: "auth", message: "Calendar API 401" } }),
        { status: 401 },
      ),
    );
    const out = await clipLikeAdapter.onContentEdited!(card, clip());
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toContain("401");
  });

  it("onContentEdited returns ok:false on network failure", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("offline"),
    );
    const out = await clipLikeAdapter.onContentEdited!(card, clip());
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toContain("offline");
  });
});
