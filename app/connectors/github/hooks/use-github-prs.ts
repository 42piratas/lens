"use client";

import { useQuery } from "@tanstack/react-query";
import type { IntegrationErrorKind } from "../../_shared/integration-error";
import type { GhPrFilter, GhPullRequest } from "../types";

type ApiError = { kind: IntegrationErrorKind; message: string };

async function fetchPrs(filter: GhPrFilter, repo?: string): Promise<GhPullRequest[]> {
  const params = new URLSearchParams({ filter });
  if (repo) params.set("repo", repo);
  const res = await fetch(`/api/github/prs?${params.toString()}`);
  const text = await res.text();
  const json = text
    ? (JSON.parse(text) as { data?: { prs: GhPullRequest[] }; error?: ApiError })
    : {};
  if (!res.ok) {
    const err: ApiError = json.error ?? { kind: "unknown", message: text || res.statusText };
    throw Object.assign(new Error(err.message), { kind: err.kind });
  }
  return json.data?.prs ?? [];
}

export function useGithubPrs(
  args: { filter: GhPrFilter; repo?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: ["github", "prs", args.filter, args.repo ?? null] as const,
    queryFn: () => fetchPrs(args.filter, args.repo),
    enabled,
  });
}
