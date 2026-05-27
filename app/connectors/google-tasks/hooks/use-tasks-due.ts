"use client";

import { useQuery } from "@tanstack/react-query";
import type { Task } from "../types";
import type { ApiError } from "./use-tasklists";

type Args = {
  lookaheadDays: number;
  showHidden?: boolean;
};

async function fetchDue(args: Args): Promise<Task[]> {
  const params = new URLSearchParams({ lookaheadDays: String(args.lookaheadDays) });
  if (args.showHidden) params.set("showHidden", "1");
  const res = await fetch(`/api/google/tasks/due?${params.toString()}`);
  const text = await res.text();
  const json = text ? (JSON.parse(text) as { tasks?: Task[]; error?: ApiError }) : {};
  if (!res.ok) {
    const err: ApiError = json.error ?? { kind: "unknown", message: text || res.statusText };
    throw Object.assign(new Error(err.message), { kind: err.kind });
  }
  return json.tasks ?? [];
}

export function useGoogleTasksDue(args: Args, enabled = true) {
  return useQuery({
    queryKey: ["google-tasks", "due", args.lookaheadDays, args.showHidden ?? false],
    queryFn: () => fetchDue(args),
    enabled,
  });
}
