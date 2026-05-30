"use client";

import { useQuery } from "@tanstack/react-query";
import type { IntegrationErrorKind } from "../../_shared/integration-error";
import type { GhNotification, GhNotificationFilter } from "../types";

type ApiError = { kind: IntegrationErrorKind; message: string };

async function fetchNotifications(
  filter: GhNotificationFilter,
  showRead: boolean,
): Promise<GhNotification[]> {
  const params = new URLSearchParams({ filter });
  if (showRead) params.set("showRead", "1");
  const res = await fetch(`/api/github/notifications?${params.toString()}`);
  const text = await res.text();
  const json = text
    ? (JSON.parse(text) as {
        data?: { notifications: GhNotification[] };
        error?: ApiError;
      })
    : {};
  if (!res.ok) {
    const err: ApiError = json.error ?? { kind: "unknown", message: text || res.statusText };
    throw Object.assign(new Error(err.message), { kind: err.kind });
  }
  return json.data?.notifications ?? [];
}

export function useGithubNotifications(
  args: { filter: GhNotificationFilter; showRead: boolean },
  enabled = true,
) {
  return useQuery({
    queryKey: ["github", "notifications", args.filter, args.showRead] as const,
    queryFn: () => fetchNotifications(args.filter, args.showRead),
    enabled,
  });
}
