import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tagLikeAdapter } from "@/connectors/google-calendar/payload-adapters/tag-like";
import type { LayoutCard } from "@/connectors/types";
import type { GoogleCalendarConfig } from "@/connectors/google-calendar/manifest";

const oneDayCard: LayoutCard<GoogleCalendarConfig> = {
  id: "card-1",
  connector: "google-calendar",
  tile: "calendar-one-day",
  x: 0,
  y: 0,
  w: 4,
  h: 4,
  config: { calendarIds: ["primary"] },
};

describe("calendar tag-like payload adapter", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("canAccept gates on configured calendarIds + non-empty name (any calendar tile)", () => {
    expect(
      tagLikeAdapter.canAccept(oneDayCard, { kind: "tag-like", name: "OKR1" }),
    ).toBe(true);
    expect(
      tagLikeAdapter.canAccept(
        { ...oneDayCard, tile: "calendar-one-week" },
        { kind: "tag-like", name: "OKR1" },
      ),
    ).toBe(true);
    expect(
      tagLikeAdapter.canAccept(
        { ...oneDayCard, tile: "calendar-many-weeks" },
        { kind: "tag-like", name: "OKR1" },
      ),
    ).toBe(true);
    expect(
      tagLikeAdapter.canAccept(
        { ...oneDayCard, config: { calendarIds: [] } },
        { kind: "tag-like", name: "OKR1" },
      ),
    ).toBe(false);
    expect(
      tagLikeAdapter.canAccept(oneDayCard, { kind: "tag-like", name: "" }),
    ).toBe(false);
  });

  it("onAccept PATCHes the targeted event with colorId + description prefix", async () => {
    const f = fetch as unknown as ReturnType<typeof vi.fn>;
    f.mockResolvedValueOnce(
      new Response(JSON.stringify({ event: { id: "evt-1" } }), { status: 200 }),
    );
    const res = await tagLikeAdapter.onAccept(
      oneDayCard,
      { kind: "tag-like", name: "OKR1", description: "Ship Phase 2", color: "purple" },
      { id: "evt-1" },
    );
    expect(res).toEqual({ ok: true });
    expect(f).toHaveBeenCalledTimes(1);
    const patchInit = f.mock.calls[0][1] as RequestInit;
    const patchBody = JSON.parse(patchInit.body as string);
    expect(patchInit.method).toBe("PATCH");
    expect(patchBody.calendarId).toBe("primary");
    expect(patchBody.eventId).toBe("evt-1");
    // Calendar event color is intentionally NOT modified — only the
    // description gets the badge prefix. Event colors carry user meaning.
    expect(patchBody.colorId).toBeUndefined();
    expect(patchBody.descriptionPrefix).toBe("[OKR1] Ship Phase 2");
  });

  it("onAccept rejects when no target.id is provided", async () => {
    const res = await tagLikeAdapter.onAccept(oneDayCard, {
      kind: "tag-like",
      name: "OKR1",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toContain("specific calendar event");
  });

  it("onAccept surfaces 401 messages from the events PATCH", async () => {
    const f = fetch as unknown as ReturnType<typeof vi.fn>;
    f.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: { kind: "auth", message: "Calendar API 401" } }),
        { status: 401 },
      ),
    );
    const res = await tagLikeAdapter.onAccept(
      oneDayCard,
      { kind: "tag-like", name: "OKR1" },
      { id: "evt-1" },
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toContain("401");
  });
});
