"use client";

import { useQuery } from "@tanstack/react-query";
import type { TrelloList } from "../types";
import type { ApiError } from "./use-boards";

async function fetchLists(boardId: string): Promise<TrelloList[]> {
  const res = await fetch(`/api/trello/lists?boardId=${encodeURIComponent(boardId)}`);
  const text = await res.text();
  const json = text ? (JSON.parse(text) as { lists?: TrelloList[]; error?: ApiError }) : {};
  if (!res.ok) {
    const err: ApiError = json.error ?? { kind: "unknown", message: text || res.statusText };
    throw Object.assign(new Error(err.message), { kind: err.kind });
  }
  return json.lists ?? [];
}

export function useTrelloLists(boardId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["trello", "lists", boardId],
    queryFn: () => fetchLists(boardId as string),
    enabled: enabled && Boolean(boardId),
  });
}
