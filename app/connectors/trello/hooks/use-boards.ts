"use client";

import { useQuery } from "@tanstack/react-query";
import type { IntegrationErrorKind, TrelloBoard } from "../types";

export type ApiError = { kind: IntegrationErrorKind; message: string };

async function fetchBoards(): Promise<TrelloBoard[]> {
  const res = await fetch("/api/trello/boards");
  const text = await res.text();
  const json = text ? (JSON.parse(text) as { boards?: TrelloBoard[]; error?: ApiError }) : {};
  if (!res.ok) {
    const err: ApiError = json.error ?? { kind: "unknown", message: text || res.statusText };
    throw Object.assign(new Error(err.message), { kind: err.kind });
  }
  return json.boards ?? [];
}

export function useTrelloBoards() {
  return useQuery({
    queryKey: ["trello", "boards"],
    queryFn: fetchBoards,
  });
}
