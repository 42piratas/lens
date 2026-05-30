import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// b02-15 moved connectors to per-user tokens (getUserIdOrThrow + readOAuthTokens);
// these tests run outside a withUser scope, so stub the user context + token read.
vi.mock("@/lib/auth/user-context", () => ({ getUserIdOrThrow: () => "u1" }));
vi.mock("@/lib/auth/persist-oauth-tokens", () => ({
  readOAuthTokens: async () => ({
    accessToken: "tok",
    refreshToken: null,
    expiresAt: null,
    scopes: [],
  }),
}));

import {
  _resetTrelloCache,
  listBoards,
  listLists,
  listCards,
} from "@/connectors/trello/client";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe("trello client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    process.env.TRELLO_API_KEY = "key";
    process.env.TRELLO_API_TOKEN = "tok";
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    _resetTrelloCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("listBoards normalizes and sorts by name", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        { id: "b2", name: "Beta", closed: false },
        { id: "b1", name: "Alpha", closed: false },
        { id: "b3", name: "Charlie", closed: true },
      ]),
    );
    const out = await listBoards();
    expect(out.map((b) => b.name)).toEqual(["Alpha", "Beta", "Charlie"]);
    expect(out[2].closed).toBe(true);
  });

  it("listBoards caches within TTL", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([{ id: "b1", name: "Alpha" }]))
      .mockResolvedValueOnce(jsonResponse([{ id: "b2", name: "Beta" }]));
    await listBoards();
    await listBoards();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("listLists sorts by pos and includes closed", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        { id: "l3", name: "Done", pos: 3, closed: false },
        { id: "l1", name: "Todo", pos: 1, closed: false },
        { id: "l2", name: "Doing", pos: 2, closed: true },
      ]),
    );
    const out = await listLists("board1");
    expect(out.map((l) => l.name)).toEqual(["Todo", "Doing", "Done"]);
    expect(out[1].closed).toBe(true);
  });

  it("listCards normalizes labels and badges, filters by listIds", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse([
          { id: "l1", name: "Todo", pos: 1, closed: false },
          { id: "l2", name: "Doing", pos: 2, closed: false },
        ]),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "c1",
            name: "Buy milk",
            due: null,
            dueComplete: false,
            idList: "l1",
            url: "https://trello.com/c/c1",
            labels: [
              { name: "urgent", color: "red" },
              { name: "", color: "purple" },
              { name: "weird", color: "magenta" },
            ],
            badges: { comments: 2, attachments: 0, checkItems: 4, checkItemsChecked: 2 },
          },
          {
            id: "c2",
            name: "Refactor",
            due: "2026-05-10T00:00:00Z",
            dueComplete: false,
            idList: "l2",
            url: "https://trello.com/c/c2",
          },
        ]),
      );
    const out = await listCards({ boardId: "b1", listIds: ["l1"] });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      id: "c1",
      listName: "Todo",
      labels: [
        { name: "urgent", color: "red" },
        { name: "", color: "purple" },
        { name: "weird", color: null },
      ],
      badges: { comments: 2, attachments: 0, checklistsTotal: 4, checklistsDone: 2 },
    });
  });

  it("listCards dueWithinDays filters and sorts ascending", async () => {
    const now = Date.now();
    const inOne = new Date(now + 1 * 24 * 60 * 60 * 1000).toISOString();
    const inFive = new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString();
    const inTwenty = new Date(now + 20 * 24 * 60 * 60 * 1000).toISOString();
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse([{ id: "l1", name: "Todo", pos: 1, closed: false }]),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          { id: "c1", name: "later", due: inFive, dueComplete: false, idList: "l1", url: "u" },
          { id: "c2", name: "soon", due: inOne, dueComplete: false, idList: "l1", url: "u" },
          { id: "c3", name: "way later", due: inTwenty, dueComplete: false, idList: "l1", url: "u" },
          { id: "c4", name: "done", due: inOne, dueComplete: true, idList: "l1", url: "u" },
        ]),
      );
    const out = await listCards({ boardId: "b1", dueWithinDays: 7 });
    expect(out.map((c) => c.id)).toEqual(["c2", "c1"]);
  });

  it("normalizes 401 to auth error", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "secret-leaked-here",
    } as unknown as Response);
    await expect(listBoards()).rejects.toMatchObject({
      name: "IntegrationError",
      kind: "auth",
    });
    await expect(listBoards()).rejects.not.toMatchObject({
      message: expect.stringContaining("secret-leaked-here"),
    });
  });

  it("normalizes 429 to rate-limit error", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => "slow down",
    } as unknown as Response);
    await expect(listBoards()).rejects.toMatchObject({
      name: "IntegrationError",
      kind: "rate-limit",
    });
  });

  it("throws auth IntegrationError when env vars missing", async () => {
    delete process.env.TRELLO_API_KEY;
    await expect(listBoards()).rejects.toMatchObject({
      name: "IntegrationError",
      kind: "auth",
    });
  });
});
