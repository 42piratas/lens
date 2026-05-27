"use client";

import { useEffect, useMemo, useState } from "react";
import type { LayoutCard } from "@/connectors/types";
import type { GoogleCalendarConfig } from "@/connectors/google-calendar/manifest";
import type { NormalizedEvent } from "@/connectors/google-calendar/types";
import { useCalendarEventsMulti } from "@/connectors/google-calendar/hooks/use-calendar-events";
import { useCalendarColors } from "@/connectors/google-calendar/hooks/use-calendar-colors";
import {
  rangeForView,
  startOfWeek,
  diffDays,
  type StartOfWeek,
} from "@/connectors/google-calendar/dates";
import {
  CalendarSkeleton,
  CalendarErrorPill,
} from "@/connectors/google-calendar/_shared/states";
import {
  eventColor,
  eventDayRange,
  packTracks,
} from "@/connectors/google-calendar/_shared/utils";
import { useClips } from "@/lib/dnd-payloads/use-clips";
import { PluginRowDropTarget } from "@/components/grid/PluginRowDropTarget";

const MIN_TRACKS = 3;

export function GoogleCalendarMacroTile({
  card,
}: {
  card: LayoutCard<GoogleCalendarConfig>;
}) {
  const calendarIds = card.config.calendarIds ?? [];
  const weeks = clamp(card.config.weeks ?? 6, 2, 12);
  const sow: StartOfWeek = card.config.startOfWeek ?? "mon";
  const range = useMemo(
    () => rangeForView({ view: "macro", now: new Date(), weeks, startOfWeek: sow }),
    [weeks, sow],
  );
  const { data, isLoading, error } = useCalendarEventsMulti(
    { calendarIds, ...range },
    calendarIds.length > 0,
  );
  const calendarColors = useCalendarColors();
  if (calendarIds.length === 0) return <Unconfigured />;
  if (isLoading) return <CalendarSkeleton />;
  if (error) return <CalendarErrorPill error={error} />;
  return <MacroBody card={card} events={data ?? []} weeks={weeks} sow={sow} calendarColors={calendarColors} />;
}

function Unconfigured() {
  return (
    <div className="lens-cal-state">
      <span className="meta-mono lens-cal-state-sub">Pick a calendar — gear icon</span>
    </div>
  );
}

function MacroBody({
  card,
  events,
  weeks,
  sow,
  calendarColors,
}: {
  card: LayoutCard<GoogleCalendarConfig>;
  events: NormalizedEvent[];
  weeks: number;
  sow: StartOfWeek;
  calendarColors: Map<string, string>;
}) {
  const { isClipped, toggleClip } = useClips();
  const days = weeks * 7;
  const rangeStart = useMemo(() => startOfWeek(new Date(), sow), [sow]);
  const weekMarkerDow = sow === "mon" ? 1 : 0;

  const bars = useMemo(() => {
    const ranged: Array<{
      id: string;
      title: string;
      description: string;
      startDay: number;
      endDay: number;
      color: string;
      calendarId: string;
    }> = [];
    for (const e of events) {
      const r = eventDayRange(e, rangeStart, days);
      if (!r) continue;
      ranged.push({
        id: e.id,
        title: e.title,
        description: e.description,
        startDay: r.startDay,
        endDay: r.endDay,
        color: eventColor(e, calendarColors),
        calendarId: e.calendarId,
      });
    }
    return packTracks(ranged);
  }, [events, rangeStart, days, calendarColors]);

  const trackCount = Math.max(MIN_TRACKS, bars.reduce((m, b) => Math.max(m, b.track + 1), 0));

  const dayMeta = useMemo(() => {
    const out: Array<{ dow: number; isWeekend: boolean; label: string | null }> = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(rangeStart);
      d.setDate(rangeStart.getDate() + i);
      const dow = d.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const isFirst = i === 0;
      const isLast = i === days - 1;
      const isWeekStart = dow === weekMarkerDow;
      const label =
        isFirst || isLast || isWeekStart
          ? `${d.toLocaleDateString("en-US", { month: "short" }).toUpperCase()} ${d.getDate()}`
          : null;
      out.push({ dow, isWeekend, label });
    }
    return out;
  }, [rangeStart, days, weekMarkerDow]);

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  const nowFrac = useMemo(() => {
    if (!now) return null;
    const dayOffset = diffDays(now, rangeStart);
    if (dayOffset < 0 || dayOffset >= days) return null;
    const fracOfDay = (now.getHours() + now.getMinutes() / 60) / 24;
    return (dayOffset + fracOfDay) / days;
  }, [now, rangeStart, days]);

  return (
    <div
      className="lens-cal-macro-grid"
      style={{
        gridTemplateColumns: `repeat(${days}, 1fr)`,
        gridTemplateRows: `repeat(${trackCount}, minmax(var(--lens-cal-macro-track-h), 1fr))`,
      }}
    >
      {dayMeta.map((m, i) =>
        m.isWeekend ? (
          <div
            key={`we-${i}`}
            className="lens-cal-macro-weekend"
            style={{ left: `${(i / days) * 100}%`, width: `${100 / days}%` }}
            aria-hidden
          />
        ) : null,
      )}
      {Array.from({ length: days - 1 }, (_, i) => {
        const dayIdx = i + 1;
        return (
          <div
            key={`div-${dayIdx}`}
            className="lens-cal-macro-divider"
            style={{ left: `${(dayIdx / days) * 100}%` }}
          />
        );
      })}
      {bars.map(({ track, bar }) => {
        const clipped = isClipped("google-calendar", bar.id);
        return (
          <PluginRowDropTarget
            key={bar.id}
            card={card}
            targetId={bar.id}
            targetMeta={{ calendarId: bar.calendarId }}
            className="lens-cal-macro-bar"
            style={{
              gridColumn: `${bar.startDay + 1} / span ${bar.endDay - bar.startDay + 1}`,
              gridRow: track + 1,
              background: bar.color,
            }}
            title={bar.title}
            dataAttrs={{ "data-clipped": clipped ? "true" : undefined }}
            onClick={() =>
              toggleClip({
                kind: "clip-like",
                label: bar.title,
                source: { connector: "google-calendar", sourceId: bar.id },
                parentTitle: "CALENDAR",
                originalContent: bar.description,
                meta: { calendarId: bar.calendarId },
              })
            }
          >
            <span className="lens-cal-macro-bar-title">{bar.title}</span>
          </PluginRowDropTarget>
        );
      })}
      {nowFrac !== null && (
        <div
          className="lens-cal-macro-now"
          style={{ left: `${nowFrac * 100}%` }}
          aria-hidden
        >
          <span className="lens-cal-macro-now-dot" />
        </div>
      )}
    </div>
  );
}

export function GoogleCalendarMacroTopbar({
  card,
}: {
  card: LayoutCard<GoogleCalendarConfig>;
}) {
  const weeks = clamp(card.config.weeks ?? 6, 2, 12);
  const sow: StartOfWeek = card.config.startOfWeek ?? "mon";
  const days = weeks * 7;
  const rangeStart = useMemo(() => startOfWeek(new Date(), sow), [sow]);
  const weekMarkerDow = sow === "mon" ? 1 : 0;

  const labels = useMemo(() => {
    const out: Array<{ i: number; text: string }> = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(rangeStart);
      d.setDate(rangeStart.getDate() + i);
      const dow = d.getDay();
      const isFirst = i === 0;
      const isLast = i === days - 1;
      const isWeekStart = dow === weekMarkerDow;
      if (isFirst || isLast || isWeekStart) {
        out.push({
          i,
          text: `${d.toLocaleDateString("en-US", { month: "short" }).toUpperCase()} ${d.getDate()}`,
        });
      }
    }
    return out;
  }, [days, rangeStart, weekMarkerDow]);

  return (
    <div className="lens-cal-macro-topbar">
      {labels.map(({ i, text }) => (
        <span
          key={i}
          className="meta-mono lens-cal-macro-topbar-label"
          style={{ left: `${((i + 0.5) / days) * 100}%` }}
        >
          {text}
        </span>
      ))}
    </div>
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
