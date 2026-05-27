import "server-only";
import { IntegrationError } from "../_shared/integration-error";
import type { TraktListItem, TraktListMeta } from "./types";

const API = "https://api.trakt.tv";
const CACHE_TTL_MS = 60_000;
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

type CacheEntry<T> = { value: T; expiresAt: number };
const itemsCache = new Map<string, CacheEntry<TraktListItem[]>>();
const metaCache = new Map<string, CacheEntry<TraktListMeta>>();

function readClientId(): string {
  const id = process.env.TRAKT_CLIENT_ID;
  if (!id) {
    throw new IntegrationError(
      "auth",
      "Trakt credentials missing. Set TRAKT_CLIENT_ID in .env.local — see app/connectors/trakt/README.md.",
    );
  }
  return id;
}

async function traktFetch(path: string): Promise<{ status: number; text: string }> {
  const clientId = readClientId();
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "trakt-api-version": "2",
        "trakt-api-key": clientId,
        // Trakt sits behind Cloudflare which 403s requests without a UA.
        "User-Agent": "lens/0.1 (+https://github.com/42piratas/lens)",
      },
    });
  } catch (err) {
    throw new IntegrationError("network", (err as Error).message);
  }
  return { status: res.status, text: await res.text() };
}

function mapHttpError(status: number): IntegrationError {
  if (status === 401 || status === 403) {
    return new IntegrationError(
      "auth",
      "Trakt rejected the API key. Confirm TRAKT_CLIENT_ID in .env.local.",
    );
  }
  if (status === 404) {
    return new IntegrationError(
      "auth",
      "Trakt list is private or not found. Public-list reads only in v1.",
    );
  }
  if (status === 429) {
    return new IntegrationError("rate-limit", "Trakt rate-limited");
  }
  if (status >= 500) {
    return new IntegrationError("network", `Trakt ${status}`);
  }
  return new IntegrationError("unknown", `Trakt ${status}`);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new IntegrationError(
      "unknown",
      `Failed to parse Trakt response: ${(err as Error).message}`,
    );
  }
}

type RawListMeta = {
  name?: string;
  ids?: { slug?: string };
  user?: { ids?: { slug?: string } };
  item_count?: number;
};

type RawListItemEntry = {
  id?: number;
  rank?: number;
  listed_at?: string;
  type?: string;
  movie?: RawWork;
  show?: RawWork;
};

type RawWork = {
  title?: string;
  year?: number;
  ids?: {
    trakt?: number;
    slug?: string;
    imdb?: string;
    tmdb?: number;
    tvdb?: number;
  };
  images?: {
    poster?: string[];
    thumb?: string[];
  };
};

function pickPoster(images: RawWork["images"]): string | undefined {
  const candidates = images?.poster ?? images?.thumb ?? [];
  for (const raw of candidates) {
    if (typeof raw !== "string" || raw.length === 0) continue;
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    return `https://${raw}`;
  }
  return undefined;
}

function metaKey(username: string, slug: string): string {
  return `${username}::${slug}`;
}

function itemsKey(username: string, slug: string, limit: number): string {
  return `${username}::${slug}::${limit}`;
}

export async function getList({
  username,
  slug,
}: {
  username: string;
  slug: string;
}): Promise<TraktListMeta> {
  const key = metaKey(username, slug);
  const hit = metaCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const path = `/users/${encodeURIComponent(username)}/lists/${encodeURIComponent(slug)}`;
  const { status, text } = await traktFetch(path);
  if (status < 200 || status >= 300) throw mapHttpError(status);

  const raw = parseJson(text) as RawListMeta;
  const value: TraktListMeta = {
    username,
    slug,
    name: typeof raw?.name === "string" && raw.name.length > 0 ? raw.name : slug,
    itemCount: typeof raw?.item_count === "number" ? raw.item_count : 0,
  };
  metaCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

export async function getListItems({
  username,
  slug,
  limit = DEFAULT_LIMIT,
}: {
  username: string;
  slug: string;
  limit?: number;
}): Promise<TraktListItem[]> {
  const safeLimit = Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)));
  const key = itemsKey(username, slug, safeLimit);
  const hit = itemsCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const path = `/users/${encodeURIComponent(username)}/lists/${encodeURIComponent(slug)}/items?limit=${safeLimit}&extended=images`;
  const { status, text } = await traktFetch(path);
  if (status < 200 || status >= 300) throw mapHttpError(status);

  const raw = parseJson(text);
  if (!Array.isArray(raw)) {
    throw new IntegrationError("unknown", "Trakt returned a non-array list payload");
  }

  const filtered: TraktListItem[] = [];
  for (const entry of raw as RawListItemEntry[]) {
    const t = entry.type;
    if (t !== "movie" && t !== "show") continue;
    const work = t === "movie" ? entry.movie : entry.show;
    if (!work || typeof work.title !== "string") continue;
    const traktId = work.ids?.trakt;
    if (typeof traktId !== "number") continue;
    const workSlug = work.ids?.slug;
    const link =
      typeof workSlug === "string" && workSlug.length > 0
        ? `https://trakt.tv/${t === "movie" ? "movies" : "shows"}/${workSlug}`
        : `https://trakt.tv/${t === "movie" ? "movies" : "shows"}/${traktId}`;
    filtered.push({
      id: typeof entry.id === "number" ? entry.id : traktId,
      rank: typeof entry.rank === "number" ? entry.rank : filtered.length + 1,
      type: t,
      title: work.title,
      year: typeof work.year === "number" ? work.year : undefined,
      ids: {
        trakt: traktId,
        imdb: typeof work.ids?.imdb === "string" ? work.ids.imdb : undefined,
        tmdb: typeof work.ids?.tmdb === "number" ? work.ids.tmdb : undefined,
        tvdb: typeof work.ids?.tvdb === "number" ? work.ids.tvdb : undefined,
        slug: typeof workSlug === "string" ? workSlug : undefined,
      },
      link,
      listedAt: typeof entry.listed_at === "string" ? entry.listed_at : "",
      posterUrl: pickPoster(work.images),
    });
    if (filtered.length >= safeLimit) break;
  }

  itemsCache.set(key, { value: filtered, expiresAt: Date.now() + CACHE_TTL_MS });
  return filtered;
}

export function _resetTraktCache() {
  itemsCache.clear();
  metaCache.clear();
}
