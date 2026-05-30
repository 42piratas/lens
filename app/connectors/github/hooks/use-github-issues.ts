"use client";

import { useQuery } from "@tanstack/react-query";
import type { IntegrationErrorKind } from "../../_shared/integration-error";
import type { GhIssue, GhIssueState } from "../types";

type ApiError = { kind: IntegrationErrorKind; message: string };

export type IssuesArgs = {
  repo?: string;
  org?: string;
  state?: GhIssueState;
  labels?: string[];
  assignee?: string;
};

async function fetchIssues(args: IssuesArgs): Promise<GhIssue[]> {
  const params = new URLSearchParams();
  if (args.repo) params.set("repo", args.repo);
  if (args.org) params.set("org", args.org);
  if (args.state) params.set("state", args.state);
  if (args.labels && args.labels.length) params.set("labels", args.labels.join(","));
  if (args.assignee) params.set("assignee", args.assignee);
  const res = await fetch(`/api/github/issues?${params.toString()}`);
  const text = await res.text();
  const json = text
    ? (JSON.parse(text) as { data?: { issues: GhIssue[] }; error?: ApiError })
    : {};
  if (!res.ok) {
    const err: ApiError = json.error ?? { kind: "unknown", message: text || res.statusText };
    throw Object.assign(new Error(err.message), { kind: err.kind });
  }
  return json.data?.issues ?? [];
}

export function useGithubIssues(args: IssuesArgs, enabled = true) {
  const labelKey = (args.labels ?? []).join("|");
  return useQuery({
    queryKey: [
      "github",
      "issues",
      args.repo ?? null,
      args.org ?? null,
      args.state ?? "open",
      labelKey,
      args.assignee ?? null,
    ] as const,
    queryFn: () => fetchIssues(args),
    enabled: enabled && Boolean(args.repo || args.org),
  });
}
