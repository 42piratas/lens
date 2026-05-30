import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/connectors/github/auth", () => ({
  readGithubToken: vi.fn(async () => "tok"),
}));
vi.mock("@/lib/auth/user-context", () => ({
  getUserIdOrThrow: () => "u1",
}));

import {
  _resetGithubCache,
  fetchIssues,
  fetchNotifications,
  fetchPrs,
} from "@/connectors/github/client";

type RespInit = { status?: number; headers?: Record<string, string> };
function resp(body: unknown, init: RespInit = {}): Response {
  const status = init.status ?? 200;
  const headers = init.headers ?? {};
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
  } as unknown as Response;
}

describe("github client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    _resetGithubCache();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetchPrs maps GraphQL nodes and rolls up CI status", async () => {
    fetchMock.mockResolvedValueOnce(
      resp({
        data: {
          search: {
            nodes: [
              {
                id: "PR1",
                number: 7,
                title: "Fix the thing",
                url: "https://github.com/o/r/pull/7",
                isDraft: false,
                updatedAt: "2026-05-30T10:00:00Z",
                repository: { nameWithOwner: "o/r" },
                author: { login: "me" },
                commits: {
                  nodes: [{ commit: { statusCheckRollup: { state: "FAILURE" } } }],
                },
              },
            ],
          },
        },
      }),
    );
    const prs = await fetchPrs({ filter: "involves-me" });
    expect(prs).toHaveLength(1);
    expect(prs[0]).toMatchObject({
      number: 7,
      repo: "o/r",
      author: "me",
      status: "failure",
    });
  });

  it("60s cache — a second identical call does not hit GitHub again", async () => {
    fetchMock.mockResolvedValue(
      resp({ data: { search: { nodes: [] } } }),
    );
    await fetchPrs({ filter: "assigned" });
    await fetchPrs({ filter: "assigned" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fetchIssues surfaces a not-found error when the repo is not in the installation", async () => {
    fetchMock.mockResolvedValueOnce(
      resp({ data: { repository: null }, errors: [{ type: "NOT_FOUND" }] }),
    );
    await expect(fetchIssues({ repo: "o/missing" })).rejects.toMatchObject({
      kind: "not-found",
    });
  });

  it("fetchIssues maps repository issues with labels + assignees", async () => {
    fetchMock.mockResolvedValueOnce(
      resp({
        data: {
          repository: {
            issues: {
              nodes: [
                {
                  id: "I1",
                  number: 42,
                  title: "Bug",
                  url: "https://github.com/o/r/issues/42",
                  state: "OPEN",
                  updatedAt: "2026-05-29T08:00:00Z",
                  labels: { nodes: [{ name: "bug", color: "d73a4a" }] },
                  assignees: { nodes: [{ login: "alice" }] },
                  repository: { nameWithOwner: "o/r" },
                },
              ],
            },
          },
        },
      }),
    );
    const issues = await fetchIssues({ repo: "o/r" });
    expect(issues[0]).toMatchObject({
      number: 42,
      state: "open",
      assignees: ["alice"],
    });
    expect(issues[0].labels[0].name).toBe("bug");
  });

  it("fetchNotifications maps REST rows and converts api urls to html urls", async () => {
    fetchMock.mockResolvedValueOnce(
      resp([
        {
          id: "n1",
          reason: "mention",
          unread: true,
          updated_at: "2026-05-30T09:00:00Z",
          subject: {
            title: "Ping",
            url: "https://api.github.com/repos/o/r/issues/3",
            type: "Issue",
          },
          repository: { full_name: "o/r" },
        },
      ]),
    );
    const items = await fetchNotifications({ filter: "all" });
    expect(items[0]).toMatchObject({
      type: "Issue",
      reason: "mention",
      url: "https://github.com/o/r/issues/3",
      unread: true,
    });
  });

  it("notifications 'review-requested' filter narrows by reason", async () => {
    fetchMock.mockResolvedValueOnce(
      resp([
        {
          id: "n1",
          reason: "mention",
          unread: true,
          updated_at: "2026-05-30T09:00:00Z",
          subject: { title: "A", url: null, type: "Issue" },
          repository: { full_name: "o/r" },
        },
        {
          id: "n2",
          reason: "review_requested",
          unread: true,
          updated_at: "2026-05-30T09:01:00Z",
          subject: { title: "B", url: null, type: "PullRequest" },
          repository: { full_name: "o/r" },
        },
      ]),
    );
    const items = await fetchNotifications({ filter: "review-requested" });
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("n2");
  });

  it("surfaces a rate-limit error with a retry hint", async () => {
    fetchMock.mockResolvedValueOnce(
      resp(
        { message: "rate limited" },
        { status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "9999999999" } },
      ),
    );
    await expect(fetchPrs({ filter: "involves-me" })).rejects.toMatchObject({
      kind: "rate-limit",
    });
  });
});
