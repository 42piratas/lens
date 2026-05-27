"use client";

import { useMemo } from "react";
import type { LayoutCard } from "@/connectors/types";
import type { GoogleCalendarConfig } from "@/connectors/google-calendar/manifest";
import type { NormalizedEvent } from "@/connectors/google-calendar/types";
import { useCalendarEventsMulti } from "@/connectors/google-calendar/hooks/use-calendar-events";
import { useCalendarColors } from "@/connectors/google-calendar/hooks/use-calendar-colors";
import {
  startOfMonth,
  startOfWeek as startOfWeekFn,
  startOfNextMonth,
  addDays,
  diffDays,
} from "@/connectors/google-calendar/dates";
import {
  CalendarSkeleton,
  CalendarErrorPill,
} from "@/connectors/google-calendar/_shared/states";
import {
  eventColor,
  groupByDay,
} from "@/connectors/google-calendar/_shared/utils";

export function GoogleCalendarMonthTile({
  card,
}: {
  card: LayoutCard<GoogleCalendarConfig>;
}) {
  const calendarIds = card.config.calendarIds ?? [];
  const sow = card.config.startOfWeek ?? "mon";
  const range = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const gridStart = startOfWeekFn(monthStart, sow);
    const monthEnd = startOfNextMonth(new Date());
    const gridEnd = addDays(startOfWeekFn(monthEnd, sow), 7);
    return { timeMin: gridStart.toISOString(), timeMax: gridEnd.toISOString() };
  }, [sow]);
  const { data, isLoading, error } = useCalendarEventsMulti(
    { calendarIds, ...range },
    calendarIds.length > 0,
  );
  const calendarColors = useCalendarColors();
  if (calendarIds.length === 0) return <Unconfigured />;
  if (isLoading) return <CalendarSkeleton />;
  if (error) return <CalendarErrorPill error={error} />;
  return <MonthBody events={data ?? []} startOfWeek={sow} calendarColors={calendarColors} />;
}

function Unconfigured() {
  return (
    <div className="lens-cal-state">
      <span className="meta-mono lens-cal-state-sub">Pick a calendar — gear icon</span>
    </div>
  );
}

function MonthBody({
  events,
  startOfWeek: sow,
  calendarColors,
}: {
  events: NormalizedEvent[];
  startOfWeek: "mon" | "sun";
  calendarColors: Map<string, string>;
}) {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const gridStart = startOfWeekFn(monthStart, sow);
  const dayNames =
    sow === "mon"
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const cells: { date: Date; inMonth: boolean; isToday: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i);
    cells.push({
      date: d,
      inMonth: d.getMonth() === monthStart.getMonth(),
      isToday: diffDays(d, today) === 0,
    });
  }
  const byDay = groupByDay(events);

  return (
    <div className="lens-cal-month-shell">
      <div className="lens-cal-month-header">
        {dayNames.map((d) => (
          <span key={d} className="meta-mono lens-cal-month-dayname">
            {d}
          </span>
        ))}
      </div>
      <div className="lens-cal-month-grid">
        {cells.map((c) => {
          const key = c.date.toISOString().slice(0, 10);
          const dayEvents = byDay.get(key) ?? [];
          return (
            <div
              key={key}
              className="lens-cal-month-cell"
              data-in-month={c.inMonth ? "true" : "false"}
            >
              <span
                className="meta-mono lens-cal-month-daynum"
                data-today={c.isToday ? "true" : undefined}
              >
                {c.date.getDate()}
              </span>
              <div className="lens-cal-month-dots">
                {dayEvents.slice(0, 3).map((e) => (
                  <span
                    key={e.id}
                    className="lens-cal-month-dot"
                    style={{ background: eventColor(e, calendarColors) }}
                    title={e.title}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <span className="meta-mono lens-cal-month-overflow">+{dayEvents.length - 3}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
