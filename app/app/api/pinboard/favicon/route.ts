import { NextResponse } from "next/server";

export const runtime = "nodejs";

// 24 hours
const CACHE_TTL_SECONDS = 24 * 60 * 60;

type Cached = { contentType: string; body: ArrayBuffer; expiresAt: number };
const cache = new Map<string, Cached>();

function jsonError(status: number, code: string, detail?: string) {
  return NextResponse.json({ error: code, detail }, { status });
}

function safeUrl(raw: string | null): URL | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u;
  } catch {
    return null;
  }
}

async function fetchOne(url: string, accept = "image/*"): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      redirect: "follow",
      headers: { accept },
    });
    if (!res.ok) return null;
    return res;
  } catch {
    return null;
  }
}

/**
 * Returns a single best-guess favicon for a given URL as a binary image
 * response. Failures return a structured JSON error so the client picker
 * can fall back to a lucide override.
 *
 * Strategy: try the host's `/favicon.ico` directly; on miss, fall through
 * to Google's public favicon service. Both branches are cached in-memory
 * for 24h keyed by host.
 */
export async function GET(req: Request) {
  const target = safeUrl(new URL(req.url).searchParams.get("url"));
  if (!target) return jsonError(400, "invalid_url");

  const host = target.host;
  const now = Date.now();
  const hit = cache.get(host);
  if (hit && hit.expiresAt > now) {
    return new NextResponse(hit.body, {
      status: 200,
      headers: {
        "Content-Type": hit.contentType,
        "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}, immutable`,
      },
    });
  }

  const direct = await fetchOne(`${target.protocol}//${host}/favicon.ico`);
  const upstream =
    direct ??
    (await fetchOne(
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`,
    ));

  if (!upstream) return jsonError(404, "favicon_unreachable");

  const contentType = upstream.headers.get("content-type") ?? "image/x-icon";
  const body = await upstream.arrayBuffer();

  cache.set(host, {
    contentType,
    body,
    expiresAt: now + CACHE_TTL_SECONDS * 1000,
  });

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}, immutable`,
    },
  });
}
