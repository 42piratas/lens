import "server-only";
import { getAccessToken } from "./auth";
import {
  IntegrationError,
  type CalendarSummary,
  type NormalizedEvent,
} from "./types";

const API = "https://www.googleapis.com/calendar/v3";
const CACHE_TTL_MS = 60_000;

type EventsArgs = { calendarId: string; timeMin: string; timeMax: string };

type CacheEntry<T> = { value: T; expiresAt: number };
let calendarsCache: CacheEntry<CalendarSummary[]> | null = null;

async function gFetch(path: string, init?: RequestInit): Promise<unknown> {
  const token = await getAccessToken();
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
  } catch (err) {
    throw new IntegrationError("network", (err as Error).message);
  }
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new IntegrationError("auth", `Calendar API ${res.status}`);
    }
    if (res.status === 429) {
      throw new IntegrationError("rate-limit", `Calendar API rate-limited`);
    }
    throw new IntegrationError("unknown", `Calendar API ${res.status}`);
  }
  return text ? JSON.parse(text) : {};
}

export type EventPatch = {
  calendarId: string;
  eventId: string;
  colorId?: string;
  description?: string;
};

/**
 * PATCH a calendar event. Only the supplied fields are updated. Used by the
 * b02-05 `tag-like` payload adapter to set `colorId` + a description prefix.
 * Requires the `calendar.events` write scope on the OAuth refresh token —
 * read-only tokens reject the request with 401.
 */
export async function patchEvent(patch: EventPatch): Promise<NormalizedEvent | null> {
  const body: Record<string, string> = {};
  if (typeof patch.colorId === "string" && patch.colorId) body.colorId = patch.colorId;
  if (typeof patch.description === "string") body.description = patch.description;
  const data = (await gFetch(
    `/calendars/${encodeURIComponent(patch.calendarId)}/events/${encodeURIComponent(patch.eventId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  )) as RawEvent;
  return normalizeEvent(data, patch.calendarId);
}

export async function getEventDescription(args: {
  calendarId: string;
  eventId: string;
}): Promise<string> {
  const data = (await gFetch(
    `/calendars/${encodeURIComponent(args.calendarId)}/events/${encodeURIComponent(args.eventId)}?fields=description`,
  )) as { description?: string };
  return data.description ?? "";
}

export async function listCalendars(): Promise<CalendarSummary[]> {
  if (calendarsCache && calendarsCache.expiresAt > Date.now()) {
    return calendarsCache.value;
  }
  const data = (await gFetch("/users/me/calendarList?minAccessRole=reader")) as {
    items?: Array<{
      id: string;
      summary?: string;
      summaryOverride?: string;
      backgroundColor?: string;
      primary?: boolean;
    }>;
  };
  const items: CalendarSummary[] = (data.items ?? []).map((c) => ({
    id: c.id,
    name: c.summaryOverride ?? c.summary ?? c.id,
    backgroundColor: c.backgroundColor,
    primary: c.primary,
  }));
  items.sort((a, b) => {
    if (a.primary && !b.primary) return -1;
    if (b.primary && !a.primary) return 1;
    return a.name.localeCompare(b.name);
  });
  calendarsCache = { value: items, expiresAt: Date.now() + CACHE_TTL_MS };
  return items;
}

export async function listEvents(args: EventsArgs): Promise<NormalizedEvent[]> {
  // No server-side caching for events: descriptions and times are user-editable
  // in Google Calendar directly, and a stale TTL would mask edits made outside
  // LENS (the b02-05 follow-up surfaced this — a badge removed in GC kept
  // showing in LENS until the 60s window expired). React Query's client-side
  // staleTime gives us the de-dup we actually want.
  const params = new URLSearchParams({
    timeMin: args.timeMin,
    timeMax: args.timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "2500",
  });
  const data = (await gFetch(
    `/calendars/${encodeURIComponent(args.calendarId)}/events?${params}`,
  )) as {
    items?: Array<RawEvent>;
  };
  return (data.items ?? [])
    .map((raw) => normalizeEvent(raw, args.calendarId))
    .filter((e): e is NormalizedEvent => e !== null);
}

type RawEvent = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  colorId?: string;
};

const COLOR_BY_ID: Record<string, string> = {
  "1": "#7986CB",
  "2": "#33B679",
  "3": "#8E24AA",
  "4": "#E67C73",
  "5": "#F6BF26",
  "6": "#F4511E",
  "7": "#039BE5",
  "8": "#616161",
  "9": "#3F51B5",
  "10": "#0B8043",
  "11": "#D50000",
};

function normalizeEvent(raw: RawEvent, calendarId: string): NormalizedEvent | null {
  if (!raw.id || raw.status === "cancelled") return null;
  if (!raw.start || !raw.end) return null;
  const allDay = Boolean(raw.start.date && !raw.start.dateTime);
  const start = raw.start.dateTime ?? raw.start.date;
  const end = raw.end.dateTime ?? raw.end.date;
  if (!start || !end) return null;
  return {
    id: raw.id,
    calendarId,
    title: raw.summary ?? "(untitled)",
    description: raw.description ?? "",
    start,
    end,
    allDay,
    color: raw.colorId ? COLOR_BY_ID[raw.colorId] : undefined,
  };
}

export function _resetCalendarCache() {
  calendarsCache = null;
}
