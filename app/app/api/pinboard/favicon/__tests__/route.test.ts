import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({
  NextResponse: class extends Response {
    constructor(body?: BodyInit | null, init?: ResponseInit) {
      super(body, init);
    }
    static json(body: unknown, init?: ResponseInit) {
      return new Response(JSON.stringify(body), {
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      });
    }
  },
}));

const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("/api/pinboard/favicon", () => {
  it("rejects non-URL queries with 400", async () => {
    const mod = await import("../route");
    const res = await mod.GET(new Request("http://x/?url=not-a-url"));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid_url");
  });

  it("returns the direct favicon when the host serves /favicon.ico", async () => {
    const png = new Uint8Array([1, 2, 3, 4]).buffer;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : (input as URL).toString();
      if (url.endsWith("/favicon.ico")) {
        return new Response(png, { status: 200, headers: { "Content-Type": "image/x-icon" } });
      }
      return new Response("nope", { status: 404 });
    }) as typeof fetch;

    const mod = await import("../route");
    const res = await mod.GET(new Request("http://x/?url=https%3A%2F%2Fexample.com"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/x-icon");
    expect(res.headers.get("cache-control")).toMatch(/max-age=86400/);
  });

  it("falls through to Google s2 when /favicon.ico is unreachable", async () => {
    const png = new Uint8Array([9, 9, 9]).buffer;
    let s2Hit = false;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : (input as URL).toString();
      if (url.endsWith("/favicon.ico")) {
        return new Response("err", { status: 500 });
      }
      if (url.includes("google.com/s2/favicons")) {
        s2Hit = true;
        return new Response(png, { status: 200, headers: { "Content-Type": "image/png" } });
      }
      return new Response("nope", { status: 404 });
    }) as typeof fetch;

    const mod = await import("../route");
    const res = await mod.GET(new Request("http://x/?url=https%3A%2F%2Fexample.org"));
    expect(s2Hit).toBe(true);
    expect(res.status).toBe(200);
  });

  it("returns 404 with structured error when both branches fail", async () => {
    globalThis.fetch = vi.fn(async () => new Response("err", { status: 500 })) as typeof fetch;
    const mod = await import("../route");
    const res = await mod.GET(new Request("http://x/?url=https%3A%2F%2Fdoesnt.exist"));
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("favicon_unreachable");
  });
});
