import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  _resetTraktCache,
  getList,
  getListItems,
} from "@/connectors/trakt/client";

const ORIGINAL_ENV = process.env.TRAKT_CLIENT_ID;

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function rawText(text: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => text,
  } as unknown as Response;
}

function makeMovie(rank: number, title: string, year: number) {
  return {
    id: 1000 + rank,
    rank,
    listed_at: "2026-01-01T00:00:00.000Z",
    type: "movie",
    movie: {
      title,
      year,
      ids: {
        trakt: 9000 + rank,
        slug: title.toLowerCase().replace(/\s+/g, "-"),
        imdb: `tt${1000000 + rank}`,
        tmdb: 200000 + rank,
      },
      images: {
        poster: [
          `media.trakt.tv/posters/${rank}-medium.jpg.webp`,
          `media.trakt.tv/posters/${rank}-thumb.jpg.webp`,
        ],
      },
    },
  };
}

function makeShow(rank: number, title: string, year: number) {
  return {
    id: 2000 + rank,
    rank,
    listed_at: "2026-01-01T00:00:00.000Z",
    type: "show",
    show: {
      title,
      year,
      ids: {
        trakt: 8000 + rank,
        slug: title.toLowerCase().replace(/\s+/g, "-"),
        imdb: `tt${2000000 + rank}`,
        tmdb: 300000 + rank,
        tvdb: 400000 + rank,
      },
      images: {
        poster: [`media.trakt.tv/shows/${rank}-medium.jpg.webp`],
      },
    },
  };
}

function makePerson(rank: number, name: string) {
  return {
    id: 3000 + rank,
    rank,
    listed_at: "2026-01-01T00:00:00.000Z",
    type: "person",
    person: {
      name,
      ids: { trakt: 7000 + rank, slug: name.toLowerCase().replace(/\s+/g, "-") },
    },
  };
}

describe("trakt client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    process.env.TRAKT_CLIENT_ID = "test-client-id";
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    _resetTraktCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (ORIGINAL_ENV === undefined) delete process.env.TRAKT_CLIENT_ID;
    else process.env.TRAKT_CLIENT_ID = ORIGINAL_ENV;
  });

  it("getList parses metadata and exposes list name", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        name: "Watching",
        ids: { slug: "watching" },
        item_count: 12,
      }),
    );
    const meta = await getList({ username: "alice", slug: "watching" });
    expect(meta).toEqual({
      username: "alice",
      slug: "watching",
      name: "Watching",
      itemCount: 12,
    });
  });

  it("filters non-movie/show items BEFORE applying the limit slice", async () => {
    const payload = [
      ...Array.from({ length: 10 }, (_, i) => makeMovie(i + 1, `Movie ${i + 1}`, 2020 + i)),
      ...Array.from({ length: 10 }, (_, i) => makeShow(i + 11, `Show ${i + 1}`, 2020 + i)),
      ...Array.from({ length: 10 }, (_, i) => makePerson(i + 21, `Person ${i + 1}`)),
    ];
    fetchMock.mockResolvedValueOnce(jsonResponse(payload));
    const items = await getListItems({
      username: "alice",
      slug: "watching",
      limit: 20,
    });
    expect(items).toHaveLength(20);
    for (const it of items) {
      expect(["movie", "show"]).toContain(it.type);
    }
  });

  it("normalizes shape — type, title, year, ids, link, posterUrl", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([makeMovie(1, "Dune", 2021), makeShow(2, "Severance", 2022)]),
    );
    const items = await getListItems({ username: "alice", slug: "watching" });
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      type: "movie",
      title: "Dune",
      year: 2021,
      link: "https://trakt.tv/movies/dune",
    });
    expect(items[0].ids.imdb).toBe("tt1000001");
    expect(items[0].ids.tmdb).toBe(200001);
    // First poster from images.poster, https-prefixed
    expect(items[0].posterUrl).toBe("https://media.trakt.tv/posters/1-medium.jpg.webp");
    expect(items[1]).toMatchObject({
      type: "show",
      title: "Severance",
      year: 2022,
      link: "https://trakt.tv/shows/severance",
      posterUrl: "https://media.trakt.tv/shows/2-medium.jpg.webp",
    });
  });

  it("posterUrl is undefined when images.poster is missing", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        {
          id: 1,
          rank: 1,
          listed_at: "2026-01-01T00:00:00.000Z",
          type: "movie",
          movie: {
            title: "Old Film",
            year: 1980,
            ids: { trakt: 100, slug: "old-film" },
          },
        },
      ]),
    );
    const items = await getListItems({ username: "alice", slug: "watching" });
    expect(items[0].posterUrl).toBeUndefined();
  });

  it("requests ?extended=images so posters are included", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    await getListItems({ username: "alice", slug: "watching" });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("extended=images");
  });

  it("clamps limit to [1, 50] and passes the safe value to upstream", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    await getListItems({ username: "alice", slug: "watching", limit: 999 });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("limit=50");
  });

  it("caches getListItems within TTL by (username, slug, limit)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([makeMovie(1, "Dune", 2021)]));
    await getListItems({ username: "alice", slug: "watching", limit: 5 });
    await getListItems({ username: "alice", slug: "watching", limit: 5 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses separate cache keys per slug", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]));
    await getListItems({ username: "alice", slug: "watching" });
    await getListItems({ username: "alice", slug: "to-watch" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("normalizes 401 to auth (bad-key) error", async () => {
    fetchMock.mockResolvedValueOnce(rawText("unauthorized", 401));
    await expect(
      getListItems({ username: "alice", slug: "watching" }),
    ).rejects.toMatchObject({ name: "IntegrationError", kind: "auth" });
  });

  it("normalizes 404 to auth (privacy) error", async () => {
    fetchMock.mockResolvedValueOnce(rawText("not found", 404));
    await expect(
      getListItems({ username: "alice", slug: "watching" }),
    ).rejects.toMatchObject({ name: "IntegrationError", kind: "auth" });
  });

  it("normalizes 429 to rate-limit error", async () => {
    fetchMock.mockResolvedValueOnce(rawText("slow down", 429));
    await expect(
      getListItems({ username: "alice", slug: "watching" }),
    ).rejects.toMatchObject({ name: "IntegrationError", kind: "rate-limit" });
  });

  it("normalizes 5xx to network error", async () => {
    fetchMock.mockResolvedValueOnce(rawText("boom", 503));
    await expect(
      getListItems({ username: "alice", slug: "watching" }),
    ).rejects.toMatchObject({ name: "IntegrationError", kind: "network" });
  });

  it("normalizes a thrown fetch to network error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ECONNRESET"));
    await expect(
      getListItems({ username: "alice", slug: "watching" }),
    ).rejects.toMatchObject({ name: "IntegrationError", kind: "network" });
  });

  it("throws auth error when TRAKT_CLIENT_ID is unset", async () => {
    delete process.env.TRAKT_CLIENT_ID;
    await expect(
      getListItems({ username: "alice", slug: "watching" }),
    ).rejects.toMatchObject({ name: "IntegrationError", kind: "auth" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("URL-encodes username and slug", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    await getListItems({ username: "alice b", slug: "to watch" });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/users/alice%20b/lists/to%20watch/items");
  });

  it("sends trakt-api-key header on every request", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    await getListItems({ username: "alice", slug: "watching" });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["trakt-api-key"]).toBe("test-client-id");
    expect(headers["trakt-api-version"]).toBe("2");
  });

  it("normalizes a non-array payload to unknown error", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ unexpected: true }));
    await expect(
      getListItems({ username: "alice", slug: "watching" }),
    ).rejects.toMatchObject({ name: "IntegrationError", kind: "unknown" });
  });

  it("normalizes JSON parse failure to unknown error", async () => {
    fetchMock.mockResolvedValueOnce(rawText("not-json{{{", 200));
    await expect(
      getListItems({ username: "alice", slug: "watching" }),
    ).rejects.toMatchObject({ name: "IntegrationError", kind: "unknown" });
  });
});
