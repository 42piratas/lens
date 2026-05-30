import "server-only";
import { IntegrationError } from "../_shared/integration-error";
import { getUserIdOrThrow } from "@/lib/auth/user-context";
import { readGithubToken } from "./auth";
import type {
  GhIssue,
  GhIssueState,
  GhLabel,
  GhNotification,
  GhNotificationFilter,
  GhNotificationType,
  GhPrFilter,
  GhPullRequest,
  GhStatus,
  GhViewer,
} from "./types";

const GRAPHQL = "https://api.github.com/graphql";
const REST = "https://api.github.com";
const CACHE_TTL_MS = 60_000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
// GitHub requires a User-Agent on every request.
const UA = "lens/0.1 (+https://github.com/42piratas/lens)";

type CacheEntry<T> = { value: T; expiresAt: number };
const cache = new Map<string, CacheEntry<unknown>>();

function cacheGet<T>(key: string): T | undefined {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  return undefined;
}
function cacheSet<T>(key: string, value: T): void {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function _resetGithubCache(): void {
  cache.clear();
}

function clampLimit(limit?: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)));
}

function mapHttpError(res: Response): IntegrationError {
  const remaining = res.headers.get("x-ratelimit-remaining");
  if (res.status === 401) {
    return new IntegrationError(
      "auth",
      "GitHub rejected the token. Reconnect GitHub in /settings.",
    );
  }
  if (res.status === 403 && remaining === "0") {
    const reset = res.headers.get("x-ratelimit-reset");
    const mins = reset
      ? Math.max(1, Math.ceil((Number(reset) * 1000 - Date.now()) / 60_000))
      : null;
    return new IntegrationError(
      "rate-limit",
      mins ? `GitHub rate-limited — retry in ${mins}m` : "GitHub rate-limited",
    );
  }
  if (res.status === 403) {
    return new IntegrationError("auth", "GitHub forbidden (403).");
  }
  if (res.status === 404) {
    return new IntegrationError("not-found", "GitHub resource not found.");
  }
  if (res.status === 429) {
    return new IntegrationError("rate-limit", "GitHub rate-limited");
  }
  if (res.status >= 500) {
    return new IntegrationError("network", `GitHub ${res.status}`);
  }
  return new IntegrationError("unknown", `GitHub ${res.status}`);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new IntegrationError(
      "unknown",
      `Failed to parse GitHub response: ${(err as Error).message}`,
    );
  }
}

const REPO_NOT_FOUND =
  "Repo not in your GitHub connection — add it at github.com/settings/installations.";

type GraphQLError = { type?: string; message?: string };

async function githubGraphQL<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const token = await readGithubToken();
  let res: Response;
  try {
    res = await fetch(GRAPHQL, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": UA,
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (err) {
    throw new IntegrationError("network", (err as Error).message);
  }
  const text = await res.text();
  if (!res.ok) throw mapHttpError(res);
  const json = parseJson(text) as { data?: T; errors?: GraphQLError[] };
  if (json.errors && json.errors.length > 0) {
    if (json.errors.some((e) => e.type === "NOT_FOUND")) {
      throw new IntegrationError("not-found", REPO_NOT_FOUND);
    }
    throw new IntegrationError(
      "unknown",
      json.errors[0]?.message ?? "GitHub GraphQL error",
    );
  }
  if (!json.data) throw new IntegrationError("unknown", "GitHub returned no data");
  return json.data;
}

async function githubRest(path: string): Promise<unknown> {
  const token = await readGithubToken();
  let res: Response;
  try {
    res = await fetch(`${REST}${path}`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": UA,
      },
    });
  } catch (err) {
    throw new IntegrationError("network", (err as Error).message);
  }
  const text = await res.text();
  if (!res.ok) throw mapHttpError(res);
  return text ? parseJson(text) : null;
}

// ---------------------------------------------------------------------------
// Viewer (connection identity — Settings row)
// ---------------------------------------------------------------------------

const VIEWER_QUERY = `query { viewer { login avatarUrl } }`;

export async function fetchViewer(): Promise<GhViewer> {
  const userId = getUserIdOrThrow();
  const key = `viewer:${userId}`;
  const cached = cacheGet<GhViewer>(key);
  if (cached) return cached;
  const data = await githubGraphQL<{ viewer: { login: string; avatarUrl: string } }>(
    VIEWER_QUERY,
    {},
  );
  const value: GhViewer = {
    login: data.viewer.login,
    avatarUrl: data.viewer.avatarUrl,
  };
  cacheSet(key, value);
  return value;
}

// ---------------------------------------------------------------------------
// PRs
// ---------------------------------------------------------------------------

function mapRollup(state?: string | null): GhStatus {
  switch (state) {
    case "SUCCESS":
      return "success";
    case "FAILURE":
    case "ERROR":
      return "failure";
    case "PENDING":
    case "EXPECTED":
      return "pending";
    default:
      return "unknown";
  }
}

function prSearchQuery(filter: GhPrFilter, repo?: string): string {
  const who =
    filter === "assigned"
      ? "assignee:@me"
      : filter === "review-requested"
        ? "review-requested:@me"
        : filter === "authored"
          ? "author:@me"
          : "involves:@me";
  const scope = repo ? ` repo:${repo}` : "";
  return `is:pr is:open ${who}${scope} sort:updated-desc`;
}

const PR_QUERY = `
query($q: String!, $n: Int!) {
  search(query: $q, type: ISSUE, first: $n) {
    nodes {
      ... on PullRequest {
        id
        number
        title
        url
        isDraft
        updatedAt
        repository { nameWithOwner }
        author { login }
        commits(last: 1) {
          nodes { commit { statusCheckRollup { state } } }
        }
      }
    }
  }
}`;

type RawPrNode = {
  id?: string;
  number?: number;
  title?: string;
  url?: string;
  isDraft?: boolean;
  updatedAt?: string;
  repository?: { nameWithOwner?: string };
  author?: { login?: string } | null;
  commits?: {
    nodes?: Array<{
      commit?: { statusCheckRollup?: { state?: string } | null };
    }>;
  };
};

export async function fetchPrs(args: {
  filter: GhPrFilter;
  repo?: string;
  limit?: number;
}): Promise<GhPullRequest[]> {
  const userId = getUserIdOrThrow();
  const limit = clampLimit(args.limit);
  const key = `prs:${userId}:${args.filter}:${args.repo ?? ""}:${limit}`;
  const cached = cacheGet<GhPullRequest[]>(key);
  if (cached) return cached;

  const data = await githubGraphQL<{ search: { nodes?: RawPrNode[] } }>(PR_QUERY, {
    q: prSearchQuery(args.filter, args.repo),
    n: limit,
  });

  const out: GhPullRequest[] = [];
  for (const n of data.search.nodes ?? []) {
    if (!n || typeof n.id !== "string" || typeof n.number !== "number") continue;
    const rollup = n.commits?.nodes?.[0]?.commit?.statusCheckRollup?.state;
    out.push({
      id: n.id,
      number: n.number,
      title: n.title ?? "(untitled)",
      url: n.url ?? "",
      repo: n.repository?.nameWithOwner ?? "",
      author: n.author?.login ?? "",
      isDraft: Boolean(n.isDraft),
      status: mapRollup(rollup),
      updatedAt: n.updatedAt ?? "",
    });
  }
  cacheSet(key, out);
  return out;
}

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------

const REPO_ISSUES_QUERY = `
query($owner: String!, $name: String!, $n: Int!, $states: [IssueState!]) {
  repository(owner: $owner, name: $name) {
    issues(first: $n, states: $states, orderBy: { field: UPDATED_AT, direction: DESC }) {
      nodes {
        id number title url state updatedAt
        labels(first: 10) { nodes { name color } }
        assignees(first: 5) { nodes { login } }
        repository { nameWithOwner }
      }
    }
  }
}`;

const SEARCH_ISSUES_QUERY = `
query($q: String!, $n: Int!) {
  search(query: $q, type: ISSUE, first: $n) {
    nodes {
      ... on Issue {
        id number title url state updatedAt
        labels(first: 10) { nodes { name color } }
        assignees(first: 5) { nodes { login } }
        repository { nameWithOwner }
      }
    }
  }
}`;

type RawIssueNode = {
  id?: string;
  number?: number;
  title?: string;
  url?: string;
  state?: string;
  updatedAt?: string;
  labels?: { nodes?: Array<{ name?: string; color?: string }> };
  assignees?: { nodes?: Array<{ login?: string }> };
  repository?: { nameWithOwner?: string };
};

function statesFor(state: GhIssueState): string[] {
  if (state === "closed") return ["CLOSED"];
  if (state === "all") return ["OPEN", "CLOSED"];
  return ["OPEN"];
}

function mapIssueNode(n: RawIssueNode): GhIssue | null {
  if (!n || typeof n.id !== "string" || typeof n.number !== "number") return null;
  const labels: GhLabel[] = (n.labels?.nodes ?? [])
    .filter((l): l is { name: string; color?: string } => typeof l?.name === "string")
    .map((l) => ({ name: l.name, color: l.color ?? "888888" }));
  return {
    id: n.id,
    number: n.number,
    title: n.title ?? "(untitled)",
    url: n.url ?? "",
    repo: n.repository?.nameWithOwner ?? "",
    state: n.state === "CLOSED" ? "closed" : "open",
    labels,
    assignees: (n.assignees?.nodes ?? [])
      .map((a) => a?.login)
      .filter((l): l is string => typeof l === "string"),
    updatedAt: n.updatedAt ?? "",
  };
}

function issueSearchQuery(args: {
  org: string;
  state: GhIssueState;
  labels?: string[];
  assignee?: string;
}): string {
  const parts = [`org:${args.org}`, "is:issue"];
  if (args.state !== "all") parts.push(`state:${args.state}`);
  for (const l of args.labels ?? []) parts.push(`label:"${l}"`);
  if (args.assignee) parts.push(`assignee:${args.assignee}`);
  parts.push("sort:updated-desc");
  return parts.join(" ");
}

export async function fetchIssues(args: {
  repo?: string;
  org?: string;
  state?: GhIssueState;
  labels?: string[];
  assignee?: string;
  limit?: number;
}): Promise<GhIssue[]> {
  const userId = getUserIdOrThrow();
  const state: GhIssueState = args.state ?? "open";
  const limit = clampLimit(args.limit);
  const labelKey = (args.labels ?? []).join("|");
  const key = `issues:${userId}:${args.repo ?? ""}:${args.org ?? ""}:${state}:${labelKey}:${args.assignee ?? ""}:${limit}`;
  const cached = cacheGet<GhIssue[]>(key);
  if (cached) return cached;

  let out: GhIssue[] = [];
  if (args.repo) {
    const [owner, name] = args.repo.split("/");
    if (!owner || !name) {
      throw new IntegrationError("unknown", 'repo must be "owner/name"');
    }
    const data = await githubGraphQL<{
      repository: { issues: { nodes?: RawIssueNode[] } } | null;
    }>(REPO_ISSUES_QUERY, { owner, name, n: limit, states: statesFor(state) });
    if (!data.repository) throw new IntegrationError("not-found", REPO_NOT_FOUND);
    let nodes = (data.repository.issues.nodes ?? [])
      .map(mapIssueNode)
      .filter((i): i is GhIssue => i !== null);
    // repo-node query has no server-side label/assignee filter — apply client-side.
    if (args.labels && args.labels.length > 0) {
      const want = new Set(args.labels.map((l) => l.toLowerCase()));
      nodes = nodes.filter((i) =>
        i.labels.some((l) => want.has(l.name.toLowerCase())),
      );
    }
    if (args.assignee) {
      const a = args.assignee.toLowerCase();
      nodes = nodes.filter((i) =>
        i.assignees.some((x) => x.toLowerCase() === a),
      );
    }
    out = nodes;
  } else if (args.org) {
    const data = await githubGraphQL<{ search: { nodes?: RawIssueNode[] } }>(
      SEARCH_ISSUES_QUERY,
      {
        q: issueSearchQuery({
          org: args.org,
          state,
          labels: args.labels,
          assignee: args.assignee,
        }),
        n: limit,
      },
    );
    out = (data.search.nodes ?? [])
      .map(mapIssueNode)
      .filter((i): i is GhIssue => i !== null);
  } else {
    throw new IntegrationError("unknown", "issues mode needs a repo or org");
  }
  cacheSet(key, out);
  return out;
}

// ---------------------------------------------------------------------------
// Notifications (REST — GraphQL has no notifications inbox)
// ---------------------------------------------------------------------------

type RawNotification = {
  id?: string;
  reason?: string;
  unread?: boolean;
  updated_at?: string;
  subject?: { title?: string; url?: string | null; type?: string };
  repository?: { full_name?: string };
};

function notificationType(type?: string): GhNotificationType {
  switch (type) {
    case "PullRequest":
      return "PullRequest";
    case "Issue":
      return "Issue";
    case "Commit":
      return "Commit";
    case "Release":
      return "Release";
    case "Discussion":
      return "Discussion";
    default:
      return "Other";
  }
}

/** Best-effort api.github.com → github.com html URL. Returns null when unknown. */
function htmlUrlFromApi(apiUrl?: string | null): string | null {
  if (!apiUrl) return null;
  const m = apiUrl.match(
    /^https:\/\/api\.github\.com\/repos\/([^/]+)\/([^/]+)\/(pulls|issues)\/(\d+)$/,
  );
  if (m) {
    const kind = m[3] === "pulls" ? "pull" : "issues";
    return `https://github.com/${m[1]}/${m[2]}/${kind}/${m[4]}`;
  }
  const repoOnly = apiUrl.match(
    /^https:\/\/api\.github\.com\/repos\/([^/]+)\/([^/]+)/,
  );
  if (repoOnly) return `https://github.com/${repoOnly[1]}/${repoOnly[2]}`;
  return null;
}

export async function fetchNotifications(args: {
  filter?: GhNotificationFilter;
  showRead?: boolean;
}): Promise<GhNotification[]> {
  const userId = getUserIdOrThrow();
  const filter: GhNotificationFilter = args.filter ?? "all";
  const showRead = Boolean(args.showRead);
  const key = `notif:${userId}:${filter}:${showRead}`;
  const cached = cacheGet<GhNotification[]>(key);
  if (cached) return cached;

  const params = new URLSearchParams();
  params.set("all", showRead ? "true" : "false");
  if (filter === "participating") params.set("participating", "true");
  params.set("per_page", "50");

  const raw = await githubRest(`/notifications?${params.toString()}`);
  if (!Array.isArray(raw)) {
    throw new IntegrationError("unknown", "GitHub returned a non-array notifications payload");
  }

  let items: GhNotification[] = (raw as RawNotification[])
    .filter((n) => typeof n?.id === "string")
    .map((n) => ({
      id: n.id as string,
      type: notificationType(n.subject?.type),
      title: n.subject?.title ?? "(no title)",
      repo: n.repository?.full_name ?? "",
      reason: n.reason ?? "",
      url: htmlUrlFromApi(n.subject?.url),
      unread: Boolean(n.unread),
      updatedAt: n.updated_at ?? "",
    }));

  // REST has no "mentions" / "review-requested" filter param — narrow by reason.
  if (filter === "mentions") {
    items = items.filter((n) => n.reason === "mention");
  } else if (filter === "review-requested") {
    items = items.filter((n) => n.reason === "review_requested");
  }

  cacheSet(key, items);
  return items;
}
