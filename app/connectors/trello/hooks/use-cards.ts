"use client";

import { useQuery } from "@tanstack/react-query";
import type { NormalizedTrelloCard } from "../types";
import type { ApiError } from "./use-boards";

type Args = {
  boardId: string | undefined;
  listIds?: string[];
  dueWithinDays?: number;
};

async function fetchCards(args: {
  boardId: string;
  listIds?: string[];
  dueWithinDays?: number;
}): Promise<NormalizedTrelloCard[]> {
  const params = new URLSearchParams({ boardId: args.boardId });
  if (args.listIds && args.listIds.length) params.set("listIds", args.listIds.join(","));
  if (typeof args.dueWithinDays === "number") {
    params.set("dueWithinDays", String(args.dueWithinDays));
  }
  const res = await fetch(`/api/trello/cards?${params.toString()}`);
  const text = await res.text();
  const json = text
    ? (JSON.parse(text) as { cards?: NormalizedTrelloCard[]; error?: ApiError })
    : {};
  if (!res.ok) {
    const err: ApiError = json.error ?? { kind: "unknown", message: text || res.statusText };
    throw Object.assign(new Error(err.message), { kind: err.kind });
  }
  return json.cards ?? [];
}

export function useTrelloCards(args: Args, enabled = true) {
  const listKey = args.listIds && args.listIds.length ? [...args.listIds].sort().join(",") : "*";
  return useQuery({
    queryKey: ["trello", "cards", args.boardId, listKey, args.dueWithinDays ?? null],
    queryFn: () => fetchCards({
      boardId: args.boardId as string,
      listIds: args.listIds,
      dueWithinDays: args.dueWithinDays,
    }),
    enabled: enabled && Boolean(args.boardId),
  });
}
