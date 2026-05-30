import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  cookieState: "S",
  persist: vi.fn(async (_params: { userId: string; provider: string }) => {}),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => ({ value: h.cookieState }),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));
vi.mock("@/auth", () => ({ auth: async () => ({ user: { id: "u1" } }) }));
vi.mock("@/lib/auth/persist-oauth-tokens", () => ({ persistOAuthTokens: h.persist }));
vi.mock("next/server", () => ({
  NextResponse: {
    redirect: (u: URL | string) =>
      new Response(null, { status: 307, headers: { Location: String(u) } }),
    json: (b: unknown, i?: ResponseInit) => new Response(JSON.stringify(b), i),
  },
}));

import { GET } from "../callback/route";

beforeEach(() => {
  process.env.GITHUB_APP_CLIENT_ID = "cid";
  process.env.GITHUB_APP_CLIENT_SECRET = "csecret";
  h.cookieState = "S";
  h.persist.mockClear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ json: async () => ({ access_token: "ght" }) })),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("/api/auth/github/callback", () => {
  it("exchanges the code and persists the token when state matches", async () => {
    const res = await GET(
      new Request("http://x/api/auth/github/callback?code=C&state=S&installation_id=1"),
    );
    expect(h.persist).toHaveBeenCalledTimes(1);
    expect(h.persist.mock.calls[0][0]).toMatchObject({
      userId: "u1",
      provider: "github",
    });
    expect(res.headers.get("Location")).toContain("github=connected");
  });

  it("rejects a CSRF state mismatch without persisting", async () => {
    h.cookieState = "S";
    const res = await GET(
      new Request("http://x/api/auth/github/callback?code=C&state=DIFFERENT"),
    );
    expect(h.persist).not.toHaveBeenCalled();
    expect(res.headers.get("Location")).toContain("github=error");
  });
});
