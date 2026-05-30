import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({
  NextResponse: class extends Response {
    static json(body: unknown, init?: ResponseInit) {
      return new Response(JSON.stringify(body), {
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      });
    }
  },
}));
vi.mock("@/lib/auth/route-wrapper", () => ({
  authedRoute:
    (h: (userId: string, req: Request) => Promise<Response>) => (req: Request) =>
      h("u1", req),
}));
vi.mock("@/connectors/github/client", () => ({
  fetchPrs: vi.fn(),
  fetchIssues: vi.fn(),
  fetchNotifications: vi.fn(),
}));

import { IntegrationError } from "@/connectors/_shared/integration-error";
import * as client from "@/connectors/github/client";
import { GET as prsGET } from "@/connectors/github/api/prs/route";
import { GET as issuesGET } from "@/connectors/github/api/issues/route";

const fetchPrs = vi.mocked(client.fetchPrs);
const fetchIssues = vi.mocked(client.fetchIssues);

beforeEach(() => {
  fetchPrs.mockReset();
  fetchIssues.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("/api/github/prs", () => {
  it("returns 200 with the PR list", async () => {
    fetchPrs.mockResolvedValue([
      {
        id: "PR1",
        number: 1,
        title: "x",
        url: "u",
        repo: "o/r",
        author: "me",
        isDraft: false,
        status: "success",
        updatedAt: "2026-05-30T00:00:00Z",
      },
    ]);
    const res = await prsGET(new Request("http://x/api/github/prs?filter=assigned"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { prs: unknown[] } };
    expect(body.data.prs).toHaveLength(1);
  });

  it("maps an auth IntegrationError to 401", async () => {
    fetchPrs.mockRejectedValue(new IntegrationError("auth", "nope"));
    const res = await prsGET(new Request("http://x/api/github/prs"));
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { kind: string } };
    expect(body.error.kind).toBe("auth");
  });
});

describe("/api/github/issues", () => {
  it("requires a repo or org (400)", async () => {
    const res = await issuesGET(new Request("http://x/api/github/issues"));
    expect(res.status).toBe(400);
  });

  it("maps a not-found IntegrationError to 404 with kind not-found", async () => {
    fetchIssues.mockRejectedValue(
      new IntegrationError("not-found", "repo not in connection"),
    );
    const res = await issuesGET(
      new Request("http://x/api/github/issues?repo=o/missing"),
    );
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { kind: string } };
    expect(body.error.kind).toBe("not-found");
  });
});
