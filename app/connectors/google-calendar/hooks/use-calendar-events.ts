"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import type { NormalizedEvent } from "../types";
import type { ApiError } from "./use-calendars";

type Args = { calendarId: string; timeMin: string; timeMax: string };

async function fetchEvents(args: Args): Promise<NormalizedEvent[]> {
  const params = new URLSearchParams(args);
  const res = await fetch(`/api/google/calendar/events?${params}`);
  const text = await res.text();
  const json = text ? (JSON.parse(text) as { events?: NormalizedEvent[]; error?: ApiError }) : {};
  if (!res.ok) {
    const err: ApiError = json.error ?? { kind: "unknown", message: text || res.statusText };
    throw Object.assign(new Error(err.message), { kind: err.kind });
  }
  return json.events ?? [];
}

export function useCalendarEvents(args: Args, enabled = true) {
  return useQuery({
    queryKey: ["google", "events", args.calendarId, args.timeMin, args.timeMax],
    queryFn: () => fetchEvents(args),
    enabled: enabled && Boolean(args.calendarId && args.timeMin && args.timeMax),
  });
}

type MultiArgs = { calendarIds: string[]; timeMin: string; timeMax: string };

export function useCalendarEventsMulti(args: MultiArgs, enabled = true) {
  const { calendarIds, timeMin, timeMax } = args;
  const ready = enabled && Boolean(timeMin && timeMax) && calendarIds.length > 0;

  const results = useQueries({
    queries: calendarIds.map((calendarId) => ({
      queryKey: ["google", "events", calendarId, timeMin, timeMax],
      queryFn: () => fetchEvents({ calendarId, timeMin, timeMax }),
      enabled: ready,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const error = results.find((r) => r.error)?.error as Error | undefined;
  const data = results.flatMap((r) => r.data ?? []);

  return { data, isLoading, error };
}
