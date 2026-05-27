"use client";

import { useQuery } from "@tanstack/react-query";
import type { IntegrationErrorKind, Tasklist } from "../types";

export type ApiError = { kind: IntegrationErrorKind; message: string };

async function fetchTasklists(): Promise<Tasklist[]> {
  const res = await fetch("/api/google/tasks/tasklists");
  const text = await res.text();
  const json = text ? (JSON.parse(text) as { tasklists?: Tasklist[]; error?: ApiError }) : {};
  if (!res.ok) {
    const err: ApiError = json.error ?? { kind: "unknown", message: text || res.statusText };
    throw Object.assign(new Error(err.message), { kind: err.kind });
  }
  return json.tasklists ?? [];
}

export function useGoogleTasklists() {
  return useQuery({
    queryKey: ["google-tasks", "tasklists"],
    queryFn: fetchTasklists,
  });
}
