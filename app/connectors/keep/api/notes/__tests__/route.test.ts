import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      }),
  },
}));

let sessionUserId: string | null = "user-a";
vi.mock("@/auth", () => ({
  auth: async () => (sessionUserId ? { user: { id: sessionUserId } } : null),
}));

const listNotesMock = vi.fn();
vi.mock("@/connectors/keep/client", () => ({
  listNotes: (...args: unknown[]) => listNotesMock(...args),
}));

beforeEach(() => {
  sessionUserId = "user-a";
  listNotesMock.mockReset();
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function callGet(url: string) {
  const mod = await import("@/connectors/keep/api/notes/route");
  return (await mod.GET(new Request(url))) as Response;
}

describe("/api/keep/notes route", () => {
  it("returns 401 when no session", async () => {
    sessionUserId = null;
    const res = await callGet("http://localhost/api/keep/notes");
    expect(res.status).toBe(401);
    const json = (await res.json()) as { error?: { kind?: string } };
    expect(json.error?.kind).toBe("auth");
  });

  it("returns notes data on success", async () => {
    listNotesMock.mockResolvedValueOnce([{ id: "n1", title: "T", text: "B" }]);
    const res = await callGet("http://localhost/api/keep/notes");
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data?: Array<{ id: string }> };
    expect(json.data?.[0]?.id).toBe("n1");
  });

  it("passes label query through to listNotes", async () => {
    listNotesMock.mockResolvedValueOnce([]);
    await callGet("http://localhost/api/keep/notes?label=Inbox");
    expect(listNotesMock).toHaveBeenCalledWith({ label: "Inbox" });
  });

  it("maps IntegrationError(auth) → 401 envelope (Workspace gate)", async () => {
    const { IntegrationError } = await import("@/connectors/keep/types");
    listNotesMock.mockRejectedValueOnce(new IntegrationError("auth", "Workspace required"));
    const res = await callGet("http://localhost/api/keep/notes");
    expect(res.status).toBe(401);
    const json = (await res.json()) as { error?: { kind?: string; message?: string } };
    expect(json.error?.kind).toBe("auth");
    expect(json.error?.message).toMatch(/workspace/i);
  });

  it("maps IntegrationError(rate-limit) → 429", async () => {
    const { IntegrationError } = await import("@/connectors/keep/types");
    listNotesMock.mockRejectedValueOnce(new IntegrationError("rate-limit", "slow down"));
    const res = await callGet("http://localhost/api/keep/notes");
    expect(res.status).toBe(429);
  });

  it("maps unknown error → 500", async () => {
    listNotesMock.mockRejectedValueOnce(new Error("boom"));
    const res = await callGet("http://localhost/api/keep/notes");
    expect(res.status).toBe(500);
  });
});
