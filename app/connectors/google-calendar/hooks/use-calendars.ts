"use client";

import { useQuery } from "@tanstack/react-query";
import type { CalendarSummary, IntegrationErrorKind } from "../types";

export type ApiError = { kind: IntegrationErrorKind; message: string };

async function fetchCalendars(): Promise<CalendarSummary[]> {
  const res = await fetch("/api/google/calendar/calendars");
  const text = await res.text();
  const json = text ? (JSON.parse(text) as { calendars?: CalendarSummary[]; error?: ApiError }) : {};
  if (!res.ok) {
    const err: ApiError = json.error ?? { kind: "unknown", message: text || res.statusText };
    throw Object.assign(new Error(err.message), { kind: err.kind });
  }
  return json.calendars ?? [];
}

export function useCalendars() {
  return useQuery({
    queryKey: ["google", "calendars"],
    queryFn: fetchCalendars,
  });
}
