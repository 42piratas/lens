import type { NormalizedEvent } from "../types";
import { startOfDay, addDays, diffDays } from "../dates";

export const FALLBACK_COLOR = "var(--accent)";

export function eventColor(
  e: NormalizedEvent,
  calendarColors?: Map<string, string> | string,
): string {
  if (e.color) return e.color;
  if (typeof calendarColors === "string") return calendarColors;
  if (calendarColors && e.calendarId) {
    const c = calendarColors.get(e.calendarId);
    if (c) return c;
  }
  return FALLBACK_COLOR;
}

export function hoursOfDay(iso: string): number {
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}

function parseAllDayLocal(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function eventDayRange(
  e: NormalizedEvent,
  rangeStart: Date,
  rangeDays: number,
): { startDay: number; endDay: number } | null {
  const evStart = e.allDay ? parseAllDayLocal(e.start) : new Date(e.start);
  const evEndExclusive = e.allDay ? parseAllDayLocal(e.end) : new Date(e.end);
  const evEnd = e.allDay ? addDays(evEndExclusive, -1) : evEndExclusive;
  const start = Math.max(0, diffDays(evStart, rangeStart));
  const end = Math.min(rangeDays - 1, diffDays(evEnd, rangeStart));
  if (end < 0 || start > rangeDays - 1 || end < start) return null;
  return { startDay: start, endDay: end };
}

export function packTracks<T extends { startDay: number; endDay: number }>(
  bars: T[],
): { track: number; bar: T }[] {
  const sorted = [...bars].sort((a, b) => a.startDay - b.startDay || a.endDay - b.endDay);
  const trackEnds: number[] = [];
  const out: { track: number; bar: T }[] = [];
  for (const bar of sorted) {
    let track = trackEnds.findIndex((end) => end < bar.startDay);
    if (track === -1) {
      track = trackEnds.length;
      trackEnds.push(bar.endDay);
    } else {
      trackEnds[track] = bar.endDay;
    }
    out.push({ track, bar });
  }
  return out;
}

export function groupByDay(events: NormalizedEvent[]): Map<string, NormalizedEvent[]> {
  const map = new Map<string, NormalizedEvent[]>();
  for (const e of events) {
    const day = startOfDay(new Date(e.start));
    const key = day.toISOString().slice(0, 10);
    const arr = map.get(key) ?? [];
    arr.push(e);
    map.set(key, arr);
  }
  return map;
}

export function formatHour(h: number): string {
  const hour = Math.floor(h);
  const min = Math.round((h - hour) * 60);
  return `${hour}:${min.toString().padStart(2, "0")}`;
}
