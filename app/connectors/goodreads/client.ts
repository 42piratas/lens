import "server-only";
import { XMLParser } from "fast-xml-parser";
import { IntegrationError } from "../_shared/integration-error";
import type { GoodreadsBook, ShelfData } from "./types";

const ENDPOINT = "https://www.goodreads.com/review/list_rss";
const CACHE_TTL_MS = 60_000;
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

type CacheEntry = { value: ShelfData; expiresAt: number };
const cache = new Map<string, CacheEntry>();

function cacheKey(userId: string, shelfName: string, limit: number): string {
  return `${userId}::${shelfName}::${limit}`;
}

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  trimValues: true,
  cdataPropName: "__cdata",
});

function stripHtml(s: string | undefined): string {
  if (!s) return "";
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function pickString(v: unknown): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    const cdata = (v as { __cdata?: unknown }).__cdata;
    if (typeof cdata === "string" && cdata !== "") return cdata;
  }
  return undefined;
}

function pickNumber(v: unknown): number | undefined {
  const s = pickString(v);
  if (s === undefined) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function toItem(raw: Record<string, unknown>): GoodreadsBook | null {
  const id = pickString(raw.book_id) ?? pickString(raw.guid);
  const title = stripHtml(pickString(raw.title) ?? "");
  const link = pickString(raw.link);
  if (!id || !title || !link) return null;
  const author = stripHtml(pickString(raw.author_name) ?? "");
  const coverUrl =
    pickString(raw.book_large_image_url) ??
    pickString(raw.book_medium_image_url) ??
    pickString(raw.book_image_url) ??
    pickString(raw.book_small_image_url);
  const isbn = pickString(raw.isbn);
  const averageRating = pickNumber(raw.average_rating);
  const userRating = pickNumber(raw.user_rating);
  const addedAt = pickString(raw.user_date_added) ?? "";
  const readAt = pickString(raw.user_read_at);
  return {
    id,
    title,
    author,
    isbn,
    coverUrl,
    link,
    averageRating,
    userRating,
    addedAt,
    readAt: readAt && readAt.length > 0 ? readAt : undefined,
  };
}

export async function listShelfBooks({
  userId,
  shelfName,
  limit = DEFAULT_LIMIT,
}: {
  userId: string;
  shelfName: string;
  limit?: number;
}): Promise<ShelfData> {
  const safeLimit = Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)));
  const key = cacheKey(userId, shelfName, safeLimit);
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const url = `${ENDPOINT}/${encodeURIComponent(userId)}?shelf=${encodeURIComponent(shelfName)}`;
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (err) {
    throw new IntegrationError("network", (err as Error).message);
  }

  const text = await res.text();
  if (res.status === 404) {
    throw new IntegrationError(
      "auth",
      'Goodreads profile is private. Set Profile visibility to "Anyone".',
    );
  }
  if (res.status === 429) {
    throw new IntegrationError("rate-limit", `Goodreads rate-limited`);
  }
  if (res.status >= 500) {
    throw new IntegrationError("network", `Goodreads ${res.status}`);
  }
  if (!res.ok) {
    throw new IntegrationError("unknown", `Goodreads ${res.status}`);
  }

  let parsed: unknown;
  try {
    parsed = parser.parse(text);
  } catch (err) {
    throw new IntegrationError("unknown", `Failed to parse RSS: ${(err as Error).message}`);
  }

  const channel = (parsed as { rss?: { channel?: { item?: unknown } } }).rss?.channel;
  if (!channel) {
    // No <rss><channel> root — Goodreads sometimes returns a 200 HTML
    // login wall instead of a 404 when a profile is private.
    throw new IntegrationError(
      "auth",
      'Goodreads profile is private. Set Profile visibility to "Anyone".',
    );
  }

  const rawItems = channel.item;
  const itemArray: Record<string, unknown>[] = Array.isArray(rawItems)
    ? (rawItems as Record<string, unknown>[])
    : rawItems
      ? [rawItems as Record<string, unknown>]
      : [];

  const books: GoodreadsBook[] = [];
  for (const raw of itemArray) {
    const book = toItem(raw);
    if (book) books.push(book);
    if (books.length >= safeLimit) break;
  }

  const result: ShelfData = { shelfName, books };
  cache.set(key, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}

export function _resetGoodreadsCache() {
  cache.clear();
}
