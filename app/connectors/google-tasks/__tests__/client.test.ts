import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  _resetTasksCache,
  listTasklists,
  listTasks,
  listTasksAcrossAll,
} from "@/connectors/google-tasks/client";
import { _resetGoogleTokenCache } from "@/connectors/_shared/google-oauth";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const tokenResponse = () =>
  jsonResponse({ access_token: "tok", expires_in: 3600 });

describe("google-tasks client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "secret";
    process.env.GOOGLE_CALENDAR_REFRESH_TOKEN = "refresh";
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    _resetTasksCache();
    _resetGoogleTokenCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("listTasklists normalizes and sorts by title", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            { id: "t2", title: "Beta" },
            { id: "t1", title: "Alpha" },
            { id: "t3", title: "Charlie" },
          ],
        }),
      );
    const out = await listTasklists();
    expect(out.map((t) => t.title)).toEqual(["Alpha", "Beta", "Charlie"]);
  });

  it("listTasklists caches within TTL", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse({ items: [{ id: "t1", title: "Alpha" }] }));
    await listTasklists();
    await listTasklists();
    expect(fetchMock).toHaveBeenCalledTimes(2); // 1 token + 1 list (second hit cached)
  });

  it("listTasks normalizes status, sorts by position, omits showHidden by default", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            { id: "c", title: "Third", status: "needsAction", position: "00000000000000000003" },
            { id: "a", title: "First", status: "needsAction", position: "00000000000000000001" },
            { id: "b", title: "Second", status: "completed", position: "00000000000000000002", completed: "2026-05-01T00:00:00Z" },
          ],
        }),
      );
    const out = await listTasks({ tasklistId: "L1", showCompleted: true });
    expect(out.map((t) => t.id)).toEqual(["a", "b", "c"]);
    expect(out[1].status).toBe("completed");
  });

  it("listTasks separates cache by showCompleted toggle", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse({ items: [{ id: "x", title: "X", status: "needsAction", position: "1" }] }))
      .mockResolvedValueOnce(jsonResponse({ items: [{ id: "y", title: "Y", status: "needsAction", position: "1" }] }));
    await listTasks({ tasklistId: "L", showCompleted: false });
    await listTasks({ tasklistId: "L", showCompleted: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("listTasksAcrossAll fans out per tasklist, filters to tasks with due, sorts ascending, denormalizes title", async () => {
    const now = Date.now();
    const inOne = new Date(now + 1 * 24 * 60 * 60 * 1000).toISOString();
    const inFive = new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString();
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            { id: "L1", title: "Personal" },
            { id: "L2", title: "Work" },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            { id: "p1", title: "later", status: "needsAction", position: "1", due: inFive },
            { id: "p2", title: "no-due", status: "needsAction", position: "2" },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            { id: "w1", title: "soon", status: "needsAction", position: "1", due: inOne },
          ],
        }),
      );
    const out = await listTasksAcrossAll({ dueMin: new Date(now).toISOString(), dueMax: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString() });
    expect(out.map((t) => t.id)).toEqual(["w1", "p1"]);
    expect(out[0].tasklistTitle).toBe("Work");
    expect(out[1].tasklistTitle).toBe("Personal");
  });

  it("normalizes 401 to auth error and does not leak body", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "secret-leaked-here",
      } as unknown as Response);
    await expect(listTasklists()).rejects.toMatchObject({
      name: "IntegrationError",
      kind: "auth",
    });
    await expect(listTasklists()).rejects.not.toMatchObject({
      message: expect.stringContaining("secret-leaked-here"),
    });
  });

  it("normalizes 429 to rate-limit error", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => "slow down",
      } as unknown as Response);
    await expect(listTasklists()).rejects.toMatchObject({
      name: "IntegrationError",
      kind: "rate-limit",
    });
  });

  it("normalizes 404 to unknown with helpful message", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => "not found",
      } as unknown as Response);
    await expect(listTasks({ tasklistId: "missing" })).rejects.toMatchObject({
      name: "IntegrationError",
      kind: "unknown",
    });
  });

  it("throws auth IntegrationError when env vars missing", async () => {
    delete process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;
    await expect(listTasklists()).rejects.toMatchObject({
      name: "IntegrationError",
      kind: "auth",
    });
  });
});
