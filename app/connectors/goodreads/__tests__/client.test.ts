import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  _resetGoodreadsCache,
  listShelfBooks,
} from "@/connectors/goodreads/client";

function rssResponse(xml: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => xml,
  } as unknown as Response;
}

const TWO_BOOKS_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test shelf</title>
    <item>
      <guid>guid-1</guid>
      <title>The Pragmatic Programmer</title>
      <link>https://www.goodreads.com/book/show/4099</link>
      <book_id>4099</book_id>
      <book_image_url>https://example.com/small.jpg</book_image_url>
      <book_medium_image_url>https://example.com/medium.jpg</book_medium_image_url>
      <book_large_image_url>https://example.com/large.jpg</book_large_image_url>
      <author_name>Andrew Hunt</author_name>
      <isbn>020161622X</isbn>
      <user_rating>5</user_rating>
      <user_read_at>Mon, 14 Jan 2024 00:00:00 -0800</user_read_at>
      <user_date_added>Mon, 14 Jan 2024 00:00:00 -0800</user_date_added>
      <average_rating>4.32</average_rating>
    </item>
    <item>
      <guid>guid-2</guid>
      <title><![CDATA[Refactoring &amp; Patterns]]></title>
      <link>https://www.goodreads.com/book/show/44936</link>
      <book_id>44936</book_id>
      <book_image_url>https://example.com/small2.jpg</book_image_url>
      <author_name><![CDATA[Martin <em>Fowler</em>]]></author_name>
      <user_rating>0</user_rating>
      <user_read_at></user_read_at>
      <user_date_added>Tue, 15 Jan 2024 00:00:00 -0800</user_date_added>
      <average_rating>4.10</average_rating>
    </item>
  </channel>
</rss>`;

const SINGLE_ITEM_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <guid>only</guid>
      <title>Lone Book</title>
      <link>https://www.goodreads.com/book/show/1</link>
      <book_id>1</book_id>
      <author_name>Solo Author</author_name>
      <user_date_added>Wed, 01 Jan 2025 00:00:00 -0800</user_date_added>
    </item>
  </channel>
</rss>`;

const EMPTY_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Empty shelf</title>
  </channel>
</rss>`;

const LOGIN_WALL_HTML = `<!doctype html><html><head><title>Sign in</title></head><body>Please sign in.</body></html>`;

describe("goodreads client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    _resetGoodreadsCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses two books, picks the largest cover, strips HTML", async () => {
    fetchMock.mockResolvedValueOnce(rssResponse(TWO_BOOKS_RSS));
    const out = await listShelfBooks({
      userId: "12345",
      shelfName: "read",
    });
    expect(out.shelfName).toBe("read");
    expect(out.books).toHaveLength(2);

    const [first, second] = out.books;
    expect(first.id).toBe("4099");
    expect(first.title).toBe("The Pragmatic Programmer");
    expect(first.author).toBe("Andrew Hunt");
    expect(first.coverUrl).toBe("https://example.com/large.jpg");
    expect(first.userRating).toBe(5);
    expect(first.averageRating).toBe(4.32);
    expect(first.readAt).toBeTruthy();

    expect(second.id).toBe("44936");
    expect(second.title).toBe("Refactoring & Patterns");
    expect(second.author).toBe("Martin Fowler");
    expect(second.coverUrl).toBe("https://example.com/small2.jpg");
    expect(second.readAt).toBeUndefined();
  });

  it("respects limit and truncates server-side", async () => {
    fetchMock.mockResolvedValueOnce(rssResponse(TWO_BOOKS_RSS));
    const out = await listShelfBooks({
      userId: "12345",
      shelfName: "read",
      limit: 1,
    });
    expect(out.books).toHaveLength(1);
    expect(out.books[0].id).toBe("4099");
  });

  it("handles a single <item> element (parser may not array-wrap)", async () => {
    fetchMock.mockResolvedValueOnce(rssResponse(SINGLE_ITEM_RSS));
    const out = await listShelfBooks({
      userId: "12345",
      shelfName: "read",
    });
    expect(out.books).toHaveLength(1);
    expect(out.books[0].title).toBe("Lone Book");
  });

  it("handles an empty channel without error", async () => {
    fetchMock.mockResolvedValueOnce(rssResponse(EMPTY_RSS));
    const out = await listShelfBooks({
      userId: "12345",
      shelfName: "read",
    });
    expect(out.books).toEqual([]);
  });

  it("caches within TTL by (userId, shelfName, limit)", async () => {
    fetchMock.mockResolvedValueOnce(rssResponse(TWO_BOOKS_RSS));
    await listShelfBooks({ userId: "12345", shelfName: "read", limit: 5 });
    await listShelfBooks({ userId: "12345", shelfName: "read", limit: 5 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses separate cache keys per shelfName", async () => {
    fetchMock
      .mockResolvedValueOnce(rssResponse(TWO_BOOKS_RSS))
      .mockResolvedValueOnce(rssResponse(EMPTY_RSS));
    await listShelfBooks({ userId: "12345", shelfName: "read" });
    await listShelfBooks({ userId: "12345", shelfName: "to-read" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("normalizes 404 to auth (privacy) error", async () => {
    fetchMock.mockResolvedValueOnce(rssResponse("not found", 404));
    await expect(
      listShelfBooks({ userId: "12345", shelfName: "read" }),
    ).rejects.toMatchObject({ name: "IntegrationError", kind: "auth" });
  });

  it("normalizes 200 HTML login-wall to auth (privacy) error", async () => {
    fetchMock.mockResolvedValueOnce(rssResponse(LOGIN_WALL_HTML, 200));
    await expect(
      listShelfBooks({ userId: "12345", shelfName: "read" }),
    ).rejects.toMatchObject({ name: "IntegrationError", kind: "auth" });
  });

  it("normalizes 429 to rate-limit error", async () => {
    fetchMock.mockResolvedValueOnce(rssResponse("slow down", 429));
    await expect(
      listShelfBooks({ userId: "12345", shelfName: "read" }),
    ).rejects.toMatchObject({ name: "IntegrationError", kind: "rate-limit" });
  });

  it("normalizes 5xx to network error", async () => {
    fetchMock.mockResolvedValueOnce(rssResponse("boom", 503));
    await expect(
      listShelfBooks({ userId: "12345", shelfName: "read" }),
    ).rejects.toMatchObject({ name: "IntegrationError", kind: "network" });
  });

  it("normalizes a thrown fetch to network error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ECONNRESET"));
    await expect(
      listShelfBooks({ userId: "12345", shelfName: "read" }),
    ).rejects.toMatchObject({ name: "IntegrationError", kind: "network" });
  });

  it("URL-encodes user id and shelf name", async () => {
    fetchMock.mockResolvedValueOnce(rssResponse(EMPTY_RSS));
    await listShelfBooks({
      userId: "12345",
      shelfName: "shelf with space",
    });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/review/list_rss/12345");
    expect(url).toContain("shelf=shelf%20with%20space");
  });
});
