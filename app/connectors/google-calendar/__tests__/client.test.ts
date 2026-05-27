import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  _resetCalendarCache,
  listCalendars,
  listEvents,
} from "@/connectors/google-calendar/client";
import { _resetTokenCache } from "@/connectors/google-calendar/auth";

const TOKEN_OK = {
  ok: true,
  status: 200,
  text: async () => JSON.stringify({ access_token: "tok", expires_in: 3600 }),
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe("google calendar client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "secret";
    process.env.GOOGLE_CALENDAR_REFRESH_TOKEN = "refresh";
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    _resetTokenCache();
    _resetCalendarCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("listCalendars normalizes summaryOverride and sorts primary first", async () => {
    fetchMock
      .mockResolvedValueOnce(TOKEN_OK as unknown as Response)
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            { id: "b@x", summary: "Beta", backgroundColor: "#222" },
            { id: "a@x", summary: "Alpha", primary: true },
            { id: "c@x", summary: "Charlie", summaryOverride: "Custom" },
          ],
        }),
      );
    const cals = await listCalendars();
    expect(cals[0]).toMatchObject({ id: "a@x", primary: true });
    expect(cals.map((c) => c.name)).toEqual(["Alpha", "Beta", "Custom"]);
  });

  it("listCalendars caches within TTL", async () => {
    fetchMock
      .mockResolvedValueOnce(TOKEN_OK as unknown as Response)
      .mockResolvedValueOnce(jsonResponse({ items: [{ id: "a", summary: "A" }] }));
    await listCalendars();
    await listCalendars();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("listEvents normalizes timed and all-day events, drops cancelled", async () => {
    fetchMock
      .mockResolvedValueOnce(TOKEN_OK as unknown as Response)
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              id: "ev1",
              summary: "Standup",
              start: { dateTime: "2026-05-02T09:00:00-03:00" },
              end: { dateTime: "2026-05-02T09:30:00-03:00" },
            },
            {
              id: "ev2",
              summary: "Off-site",
              start: { date: "2026-05-04" },
              end: { date: "2026-05-06" },
            },
            { id: "ev3", status: "cancelled" },
            {
              id: "ev4",
              colorId: "11",
              summary: "Critical",
              start: { dateTime: "2026-05-02T11:00:00-03:00" },
              end: { dateTime: "2026-05-02T12:00:00-03:00" },
            },
          ],
        }),
      );
    const out = await listEvents({
      calendarId: "primary",
      timeMin: "2026-05-01T00:00:00Z",
      timeMax: "2026-05-08T00:00:00Z",
    });
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({ id: "ev1", title: "Standup", allDay: false });
    expect(out[1]).toMatchObject({ id: "ev2", allDay: true });
    expect(out[2]).toMatchObject({ id: "ev4", color: "#D50000" });
  });

  it("listEvents always refetches (no server-side cache so external edits show up)", async () => {
    fetchMock
      .mockResolvedValueOnce(TOKEN_OK as unknown as Response)
      .mockResolvedValueOnce(jsonResponse({ items: [] }))
      .mockResolvedValueOnce(jsonResponse({ items: [] }))
      .mockResolvedValueOnce(jsonResponse({ items: [] }));
    const args = {
      calendarId: "primary",
      timeMin: "2026-05-01T00:00:00Z",
      timeMax: "2026-05-02T00:00:00Z",
    };
    await listEvents(args);
    await listEvents(args);
    await listEvents({ ...args, calendarId: "other" });
    // 1 token fetch + 3 list fetches = 4 — every listEvents call hits Google.
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("normalizes 401 to auth error and scrubs body text from message", async () => {
    fetchMock
      .mockResolvedValueOnce(TOKEN_OK as unknown as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "secret-token-leaked-here",
      } as unknown as Response);
    await expect(
      listEvents({ calendarId: "x", timeMin: "a", timeMax: "b" }),
    ).rejects.toMatchObject({
      name: "IntegrationError",
      kind: "auth",
    });
    await expect(
      listEvents({ calendarId: "y", timeMin: "a", timeMax: "b" }),
    ).rejects.not.toMatchObject({ message: expect.stringContaining("secret-token-leaked-here") });
  });

  it("normalizes 429 to rate-limit error", async () => {
    fetchMock
      .mockResolvedValueOnce(TOKEN_OK as unknown as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => "slow down",
      } as unknown as Response);
    await expect(listCalendars()).rejects.toMatchObject({
      name: "IntegrationError",
      kind: "rate-limit",
    });
  });

  it("auth-token cache reuses across calls", async () => {
    fetchMock
      .mockResolvedValueOnce(TOKEN_OK as unknown as Response)
      .mockResolvedValueOnce(jsonResponse({ items: [] }))
      .mockResolvedValueOnce(jsonResponse({ items: [] }));
    await listCalendars();
    _resetCalendarCache();
    await listCalendars();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://oauth2.googleapis.com/token");
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/users/me/calendarList");
    expect(fetchMock.mock.calls[2]?.[0]).toContain("/users/me/calendarList");
  });
});
