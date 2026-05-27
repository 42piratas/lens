import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Stub Next's server response shim before the route module loads.
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      }),
  },
}));

// Lazily-replaced session + supabase mocks per test.
const dbRows = new Map<string, { state: unknown }>();
let sessionUserId: string | null = "user-a";

function makeSupabase() {
  return {
    from(_table: string) {
      let filterUser: string | null = null;
      const builder = {
        select(_cols: string) { return builder; },
        eq(_col: string, val: string) { filterUser = val; return builder; },
        async maybeSingle<T>(): Promise<{ data: T | null; error: null }> {
          const row = filterUser != null ? dbRows.get(filterUser) ?? null : null;
          return { data: row as unknown as T | null, error: null };
        },
        async upsert(
          input: { user_id: string; state: unknown },
          _opts: unknown,
        ): Promise<{ error: null }> {
          dbRows.set(input.user_id, { state: input.state });
          return { error: null };
        },
      };
      return builder;
    },
  };
}

vi.mock("@/lib/auth/session", () => ({
  async getRouteSession() {
    if (!sessionUserId) return null;
    return { userId: sessionUserId, supabase: makeSupabase() };
  },
}));

beforeEach(() => {
  dbRows.clear();
  sessionUserId = "user-a";
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("/api/local/pinboard", () => {
  it("GET returns 401 when no session", async () => {
    sessionUserId = null;
    const mod = await import("../route");
    const res = await mod.GET();
    expect(res.status).toBe(401);
  });

  it("GET returns empty envelope when row missing", async () => {
    const mod = await import("../route");
    const res = await mod.GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { state: { pins: unknown[]; enabled: boolean } };
    expect(body.state.pins).toEqual([]);
    expect(body.state.enabled).toBe(false);
  });

  it("GET returns the existing row state", async () => {
    dbRows.set("user-a", {
      state: { version: 1, enabled: true, pins: [{ id: "1", label: "X", url: "https://x.com", icon: "", order: 0 }] },
    });
    const mod = await import("../route");
    const res = await mod.GET();
    const body = (await res.json()) as { state: { enabled: boolean; pins: { id: string }[] } };
    expect(body.state.enabled).toBe(true);
    expect(body.state.pins[0]!.id).toBe("1");
  });

  it("PUT 422 when payload fails schema", async () => {
    const mod = await import("../route");
    const req = new Request("http://x/", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: { version: 1, enabled: "yes", pins: [] } }),
    });
    const res = await mod.PUT(req);
    expect(res.status).toBe(422);
  });

  it("PUT writes a valid envelope", async () => {
    const mod = await import("../route");
    const req = new Request("http://x/", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        state: {
          version: 1,
          enabled: true,
          pins: [{ id: "p1", label: "A", url: "https://a.com", icon: "", order: 0 }],
        },
      }),
    });
    const res = await mod.PUT(req);
    expect(res.status).toBe(200);
    const stored = dbRows.get("user-a")!.state as { pins: unknown[] };
    expect(stored.pins).toHaveLength(1);
  });

  it("POST migrates when row is empty, refuses when row has pins", async () => {
    const mod = await import("../route");
    const payload = {
      state: {
        version: 1,
        enabled: false,
        pins: [{ id: "p1", label: "A", url: "https://a.com", icon: "", order: 0 }],
      },
    };
    const req1 = new Request("http://x/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const res1 = await mod.POST(req1);
    const body1 = (await res1.json()) as { migrated?: boolean };
    expect(body1.migrated).toBe(true);

    const req2 = new Request("http://x/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const res2 = await mod.POST(req2);
    const body2 = (await res2.json()) as { migrated?: boolean };
    expect(body2.migrated).toBe(false);
  });
});
