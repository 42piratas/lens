import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/google-keep-sa", () => ({
  getKeepAccessTokenFor: vi.fn(async () => "sa-access-token"),
  getKeepWorkspaceDomain: () => "example.com",
}));
vi.mock("@/lib/auth/user-context", () => ({
  getUserEmailOrThrow: () => "user@example.com",
}));

import { _resetKeepCache, listLabels, listNotes } from "@/connectors/keep/client";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const sampleGoogleNote = (overrides: Record<string, unknown> = {}) => ({
  name: "notes/n1",
  title: "T",
  body: { text: { text: "B" } },
  updateTime: "2026-05-20T10:00:00Z",
  labels: [],
  ...overrides,
});

describe("keep client (Keep REST API v1, service-account auth)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    _resetKeepCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("listNotes hits keep.googleapis.com with the SA-minted bearer", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ notes: [sampleGoogleNote()] }));
    const out = await listNotes();
    expect(out).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/^https:\/\/keep\.googleapis\.com\/v1\/notes\?/);
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer sa-access-token",
    });
  });

  it("listNotes adds label filter", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ notes: [] }));
    await listNotes({ label: "Inbox 1" });
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("filter=labels.name%3D%22Inbox+1%22");
  });

  it("maps note shape: strips notes/ prefix and synthesizes web URL", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ notes: [sampleGoogleNote({ name: "notes/abc123" })] }),
    );
    const [note] = await listNotes();
    expect(note.id).toBe("abc123");
    expect(note.url).toBe("https://keep.google.com/u/0/#NOTE/abc123");
  });

  it("flattens list body to checklist text", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        notes: [
          sampleGoogleNote({
            body: {
              list: {
                listItems: [
                  { text: { text: "buy milk" }, checked: false },
                  { text: { text: "ship pr" }, checked: true },
                ],
              },
            },
          }),
        ],
      }),
    );
    const [note] = await listNotes();
    expect(note.text).toBe("[ ] buy milk\n[x] ship pr");
  });

  it("drops trashed notes", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        notes: [
          sampleGoogleNote({ name: "notes/a", trashed: true }),
          sampleGoogleNote({ name: "notes/b" }),
        ],
      }),
    );
    const out = await listNotes();
    expect(out.map((n) => n.id)).toEqual(["b"]);
  });

  it("sorts notes by updateTime desc", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        notes: [
          sampleGoogleNote({ name: "notes/old", updateTime: "2026-05-01T00:00:00Z" }),
          sampleGoogleNote({ name: "notes/new", updateTime: "2026-05-20T00:00:00Z" }),
          sampleGoogleNote({ name: "notes/mid", updateTime: "2026-05-10T00:00:00Z" }),
        ],
      }),
    );
    const out = await listNotes();
    expect(out.map((n) => n.id)).toEqual(["new", "mid", "old"]);
  });

  it("listNotes caches per-label key within TTL", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ notes: [sampleGoogleNote({ name: "notes/a" })] }))
      .mockResolvedValueOnce(jsonResponse({ notes: [sampleGoogleNote({ name: "notes/b" })] }));
    await listNotes();
    await listNotes();
    await listNotes({ label: "Errands" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("listLabels harvests distinct label tails from notes", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        notes: [
          sampleGoogleNote({ labels: [{ name: "users/u/labels/inbox" }, { name: "users/u/labels/personal" }] }),
          sampleGoogleNote({ labels: [{ name: "users/u/labels/inbox" }] }),
        ],
      }),
    );
    const labels = await listLabels();
    expect(labels.map((l) => l.name)).toEqual(["inbox", "personal"]);
  });

  it("normalizes 401 → auth IntegrationError", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "",
      text: async () => "",
    } as unknown as Response);
    await expect(listNotes()).rejects.toMatchObject({
      name: "IntegrationError",
      kind: "auth",
    });
  });

  it("normalizes 403 → auth IntegrationError with DWD hint", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: "",
      text: async () => "",
    } as unknown as Response);
    await expect(listNotes()).rejects.toMatchObject({
      name: "IntegrationError",
      kind: "auth",
      message: expect.stringMatching(/delegation/i),
    });
  });

  it("normalizes 429 → rate-limit IntegrationError", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: "",
      text: async () => "",
    } as unknown as Response);
    await expect(listNotes()).rejects.toMatchObject({
      name: "IntegrationError",
      kind: "rate-limit",
    });
  });
});

describe("keep client (workspace-domain gate)", () => {
  beforeEach(() => {
    _resetKeepCache();
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("rejects users outside the configured Workspace domain", async () => {
    vi.resetModules();
    vi.doMock("@/lib/auth/google-keep-sa", () => ({
      getKeepAccessTokenFor: vi.fn(),
      getKeepWorkspaceDomain: () => "42labs.io",
    }));
    vi.doMock("@/lib/auth/user-context", () => ({
      getUserEmailOrThrow: () => "outsider@example.com",
    }));
    const { listNotes: listNotesIsolated } = await import("@/connectors/keep/client");
    await expect(listNotesIsolated()).rejects.toMatchObject({
      name: "IntegrationError",
      kind: "auth",
      message: expect.stringMatching(/42labs\.io/),
    });
  });
});
