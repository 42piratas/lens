"use client";

import { Fragment, useMemo } from "react";
import type { LayoutCard } from "@/connectors/types";
import type { GoogleCalendarConfig } from "@/connectors/google-calendar/manifest";
import type { NormalizedEvent } from "@/connectors/google-calendar/types";
import { useCalendarEventsMulti } from "@/connectors/google-calendar/hooks/use-calendar-events";
import { useCalendarColors } from "@/connectors/google-calendar/hooks/use-calendar-colors";
import {
  rangeForView,
  startOfWeek as startOfWeekFn,
  diffDays,
} from "@/connectors/google-calendar/dates";
import {
  CalendarSkeleton,
  CalendarErrorPill,
} from "@/connectors/google-calendar/_shared/states";
import {
  eventColor,
  eventDayRange,
  hoursOfDay,
  formatHour,
  packTracks,
} from "@/connectors/google-calendar/_shared/utils";
import { useClips } from "@/lib/dnd-payloads/use-clips";
import { PluginRowDropTarget } from "@/components/grid/PluginRowDropTarget";

const HOUR_START = 6;
const HOUR_END = 22;
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

export function GoogleCalendarWeekTile({
  card,
}: {
  card: LayoutCard<GoogleCalendarConfig>;
}) {
  const calendarIds = card.config.calendarIds ?? [];
  const sow = card.config.startOfWeek ?? "mon";
  const range = useMemo(
    () => rangeForView({ view: "week", now: new Date(), startOfWeek: sow }),
    [sow],
  );
  const { data, isLoading, error } = useCalendarEventsMulti(
    { calendarIds, ...range },
    calendarIds.length > 0,
  );
  const calendarColors = useCalendarColors();
  if (calendarIds.length === 0) return <Unconfigured />;
  if (isLoading) return <CalendarSkeleton />;
  if (error) return <CalendarErrorPill error={error} />;
  return <WeekBody card={card} events={data ?? []} startOfWeek={sow} calendarColors={calendarColors} />;
}

function Unconfigured() {
  return (
    <div className="lens-cal-state">
      <span className="meta-mono lens-cal-state-sub">Pick a calendar — gear icon</span>
    </div>
  );
}

function WeekBody({
  card,
  events,
  startOfWeek: sow,
  calendarColors,
}: {
  card: LayoutCard<GoogleCalendarConfig>;
  events: NormalizedEvent[];
  startOfWeek: "mon" | "sun";
  calendarColors: Map<string, string>;
}) {
  const { isClipped, toggleClip } = useClips();
  const weekStart = startOfWeekFn(new Date(), sow);
  const dayNames =
    sow === "mon"
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayCol = ((diffDays(new Date(), weekStart) % 7) + 7) % 7;

  const allDayBars = useMemo(() => {
    const ranged: Array<{
      id: string;
      title: string;
      startDay: number;
      endDay: number;
      color: string;
      calendarId: string;
    }> = [];
    for (const e of events) {
      if (!e.allDay) continue;
      const r = eventDayRange(e, weekStart, 7);
      if (!r) continue;
      ranged.push({
        id: e.id,
        title: e.title,
        startDay: r.startDay,
        endDay: r.endDay,
        color: eventColor(e, calendarColors),
        calendarId: e.calendarId,
      });
    }
    return packTracks(ranged);
  }, [events, weekStart, calendarColors]);

  const allDayTracks = allDayBars.reduce((m, b) => Math.max(m, b.track + 1), 0);

  return (
    <div className="lens-cal-week-scroll">
      <div className="lens-cal-week-grid">
        <div />
        {dayNames.map((d, i) => (
          <div
            key={d}
            className="meta-mono lens-cal-week-daycell"
            data-today={i === todayCol ? "true" : undefined}
          >
            {d}
          </div>
        ))}
        {allDayTracks > 0 && (
          <>
            <div
              className="lens-cal-week-allday-gutter"
              style={{ gridRow: `2 / span ${allDayTracks}`, gridColumn: 1 }}
            />
            <div
              className="lens-cal-week-allday-area"
              style={{
                gridRow: `2 / span ${allDayTracks}`,
                gridColumn: "2 / span 7",
                gridTemplateRows: `repeat(${allDayTracks}, 1fr)`,
              }}
            >
              {allDayBars.map(({ track, bar }) => (
                <PluginRowDropTarget
                  key={bar.id}
                  card={card}
                  targetId={bar.id}
                  targetMeta={{ calendarId: bar.calendarId }}
                  className="lens-cal-week-allday-bar"
                  style={{
                    gridColumn: `${bar.startDay + 1} / span ${bar.endDay - bar.startDay + 1}`,
                    gridRow: track + 1,
                    background: `color-mix(in oklab, ${bar.color} 22%, var(--surface-alt))`,
                    borderLeftColor: bar.color,
                  }}
                  title={bar.title}
                >
                  <span className="lens-cal-week-allday-title">{bar.title}</span>
                </PluginRowDropTarget>
              ))}
            </div>
          </>
        )}
        {HOURS.map((h, hourRow) => (
          <Fragment key={`row-${h}`}>
            <div
              className="meta-mono lens-cal-week-hourcell"
              style={{ gridRow: hourRow + 2 + allDayTracks, gridColumn: 1 }}
            >
              {h}:00
            </div>
            {dayNames.map((_, di) => (
              <div
                key={`c-${h}-${di}`}
                className="lens-cal-week-cell"
                style={{ gridRow: hourRow + 2 + allDayTracks, gridColumn: di + 2 }}
              />
            ))}
          </Fragment>
        ))}
        {events
          .filter((e) => !e.allDay)
          .map((e) => {
            const dayCol = ((diffDays(new Date(e.start), weekStart) % 7) + 7) % 7;
            if (dayCol < 0 || dayCol > 6) return null;
            const startHour = hoursOfDay(e.start);
            const endHour = hoursOfDay(e.end);
            if (endHour < HOUR_START || startHour > HOUR_END) return null;
            const startRow = 2 + allDayTracks + Math.max(0, Math.floor(startHour - HOUR_START));
            const endRow = 2 + allDayTracks + Math.min(HOURS.length, Math.ceil(endHour - HOUR_START));
            const span = Math.max(1, endRow - startRow);
            const color = eventColor(e, calendarColors);
            const clipped = isClipped("google-calendar", e.id);
            return (
              <PluginRowDropTarget
                key={e.id}
                card={card}
                targetId={e.id}
                targetMeta={{ calendarId: e.calendarId }}
                className="lens-cal-week-event"
                style={{
                  gridColumn: dayCol + 2,
                  gridRow: `${startRow} / span ${span}`,
                  background: `color-mix(in oklab, ${color} 22%, var(--surface-alt))`,
                  borderLeftColor: color,
                }}
                title={`${formatHour(startHour)}–${formatHour(endHour)} · ${e.title}`}
                dataAttrs={{ "data-clipped": clipped ? "true" : undefined }}
                onClick={() =>
                  toggleClip({
                    kind: "clip-like",
                    label: e.title,
                    source: { connector: "google-calendar", sourceId: e.id },
                    parentTitle: "CALENDAR",
                    originalContent: e.description,
                    meta: { calendarId: e.calendarId },
                  })
                }
              >
                <span className="lens-cal-week-event-title">{e.title}</span>
              </PluginRowDropTarget>
            );
          })}
      </div>
    </div>
  );
}
