"use client";

import { useQuery } from "@tanstack/react-query";
import type { IntegrationErrorKind } from "../../_shared/integration-error";
import type { ShelfData } from "../types";

type ApiError = { kind: IntegrationErrorKind; message: string };

async function fetchShelf(
  userId: string,
  shelfName: string,
  limit: number,
): Promise<ShelfData> {
  const params = new URLSearchParams({
    userId,
    shelfName,
    limit: String(limit),
  });
  const res = await fetch(`/api/goodreads/shelf?${params.toString()}`);
  const text = await res.text();
  const json = text
    ? (JSON.parse(text) as { data?: ShelfData; error?: ApiError })
    : {};
  if (!res.ok) {
    const err: ApiError =
      json.error ?? { kind: "unknown", message: text || res.statusText };
    throw Object.assign(new Error(err.message), { kind: err.kind });
  }
  return json.data ?? { shelfName, books: [] };
}

export function useGoodreadsShelf(
  args: { userId: string; shelfName: string; limit: number },
  enabled: boolean,
) {
  return useQuery({
    queryKey: [
      "goodreads",
      "shelf",
      args.userId,
      args.shelfName,
      args.limit,
    ] as const,
    queryFn: () => fetchShelf(args.userId, args.shelfName, args.limit),
    enabled,
  });
}
