"use client";

import { useQuery } from "@tanstack/react-query";
import type { IntegrationErrorKind } from "../../_shared/integration-error";
import type { TraktListItem, TraktListMeta } from "../types";

type ApiError = { kind: IntegrationErrorKind; message: string };
type ListResponse = { meta: TraktListMeta; items: TraktListItem[] };
type MetaResponse = { meta: TraktListMeta };

async function fetchList(
  username: string,
  slug: string,
  limit: number,
): Promise<ListResponse> {
  const params = new URLSearchParams({
    username,
    slug,
    limit: String(limit),
  });
  const res = await fetch(`/api/trakt/list?${params.toString()}`);
  const text = await res.text();
  const json = text
    ? (JSON.parse(text) as { data?: ListResponse; error?: ApiError })
    : {};
  if (!res.ok) {
    const err: ApiError =
      json.error ?? { kind: "unknown", message: text || res.statusText };
    throw Object.assign(new Error(err.message), { kind: err.kind });
  }
  if (!json.data) {
    return {
      meta: { username, slug, name: slug, itemCount: 0 },
      items: [],
    };
  }
  return json.data;
}

export function useTraktList(
  args: { username: string; slug: string; limit: number },
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["trakt", "list", args.username, args.slug, args.limit] as const,
    queryFn: () => fetchList(args.username, args.slug, args.limit),
    enabled,
  });
}

export async function fetchTraktListMeta(
  username: string,
  slug: string,
): Promise<MetaResponse | null> {
  const params = new URLSearchParams({
    username,
    slug,
    metaOnly: "1",
  });
  const res = await fetch(`/api/trakt/list?${params.toString()}`);
  const text = await res.text();
  const json = text
    ? (JSON.parse(text) as { data?: MetaResponse; error?: ApiError })
    : {};
  if (!res.ok) return null;
  return json.data ?? null;
}
