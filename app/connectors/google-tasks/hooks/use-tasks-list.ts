"use client";

import { useQuery } from "@tanstack/react-query";
import type { Task } from "../types";
import type { ApiError } from "./use-tasklists";

type Args = {
  tasklistId: string | undefined;
  showCompleted?: boolean;
  showHidden?: boolean;
};

async function fetchTasks(args: {
  tasklistId: string;
  showCompleted?: boolean;
  showHidden?: boolean;
}): Promise<Task[]> {
  const params = new URLSearchParams({ tasklistId: args.tasklistId });
  if (args.showCompleted) params.set("showCompleted", "1");
  if (args.showHidden) params.set("showHidden", "1");
  const res = await fetch(`/api/google/tasks/list?${params.toString()}`);
  const text = await res.text();
  const json = text ? (JSON.parse(text) as { tasks?: Task[]; error?: ApiError }) : {};
  if (!res.ok) {
    const err: ApiError = json.error ?? { kind: "unknown", message: text || res.statusText };
    throw Object.assign(new Error(err.message), { kind: err.kind });
  }
  return json.tasks ?? [];
}

export function useGoogleTasksList(args: Args, enabled = true) {
  return useQuery({
    queryKey: [
      "google-tasks",
      "list",
      args.tasklistId,
      args.showCompleted ?? false,
      args.showHidden ?? false,
    ],
    queryFn: () =>
      fetchTasks({
        tasklistId: args.tasklistId as string,
        showCompleted: args.showCompleted,
        showHidden: args.showHidden,
      }),
    enabled: enabled && Boolean(args.tasklistId),
  });
}
