"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LayoutCard } from "@/connectors/types";
import type { GoogleCalendarConfig } from "@/connectors/google-calendar/manifest";
import type { NormalizedEvent } from "@/connectors/google-calendar/types";
import { useCalendarEventsMulti } from "@/connectors/google-calendar/hooks/use-calendar-events";
import { useCalendarColors } from "@/connectors/google-calendar/hooks/use-calendar-colors";
import { rangeForView } from "@/connectors/google-calendar/dates";
import {
  CalendarSkeleton,
  CalendarErrorPill,
} from "@/connectors/google-calendar/_shared/states";
import {
  eventColor,
  hoursOfDay,
  formatHour,
} from "@/connectors/google-calendar/_shared/utils";
import { useClips } from "@/lib/dnd-payloads/use-clips";
import { PluginRowDropTarget } from "@/components/grid/PluginRowDropTarget";

const HOUR_START = 0;
const HOUR_END = 24;
const PX_PER_HOUR = 56;
const TIME_GUTTER = 27;

/** Extract leading `[name]` paragraph prefixes from an event description.
 * The Calendar `tag-like` adapter prepends `[name] description` (or `[name]`)
 * separated by `\n\n` from prior content, so applied badges live as the first
 * one-or-more paragraphs of `description`. We surface them as accent chips. */
function extractLeadingTags(desc: string | undefined): string[] {
  if (!desc) return [];
  const out: string[] = [];
  for (const para of desc.split(/\n\n+/)) {
    const m = para.match(/^\s*\[([^\]]+)\]/);
    if (!m) break;
    out.push(m[1]);
  }
  return out;
}

type LanePlacement = { lane: number; laneCount: number };

const MIN_EVENT_PX = 36;
const MIN_EVENT_HOURS = MIN_EVENT_PX / PX_PER_HOUR;

function packLanes(events: NormalizedEvent[]): Map<string, LanePlacement> {
  const sorted = [...events].sort(
    (a, b) => hoursOfDay(a.start) - hoursOfDay(b.start),
  );

  const laneEnds: number[] = [];
  const placed: Array<{ id: string; lane: number; start: number; end: number }> = [];
  for (const e of sorted) {
    const start = hoursOfDay(e.start);
    const visualEnd = Math.max(hoursOfDay(e.end), start + MIN_EVENT_HOURS);
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) {
      laneEnds.push(visualEnd);
      lane = laneEnds.length - 1;
    } else {
      laneEnds[lane] = visualEnd;
    }
    placed.push({ id: e.id, lane, start, end: visualEnd });
  }

  const out = new Map<string, LanePlacement>();
  let cluster: typeof placed = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    if (!cluster.length) return;
    const max = cluster.reduce((m, p) => Math.max(m, p.lane), 0);
    for (const p of cluster) out.set(p.id, { lane: p.lane, laneCount: max + 1 });
    cluster = [];
  };
  for (const p of placed) {
    if (p.start >= clusterEnd) {
      flush();
      clusterEnd = p.end;
    } else {
      clusterEnd = Math.max(clusterEnd, p.end);
    }
    cluster.push(p);
  }
  flush();
  return out;
}

export function GoogleCalendarTodayTile({
  card,
}: {
  card: LayoutCard<GoogleCalendarConfig>;
}) {
  const calendarIds = card.config.calendarIds ?? [];
  const range = useMemo(() => rangeForView({ view: "today", now: new Date() }), []);
  const { data, isLoading, error } = useCalendarEventsMulti(
    { calendarIds, ...range },
    calendarIds.length > 0,
  );
  const calendarColors = useCalendarColors();
  if (calendarIds.length === 0) return <CalendarUnconfigured />;
  if (isLoading) return <CalendarSkeleton />;
  if (error) return <CalendarErrorPill error={error} />;
  return <TodayBody card={card} events={data ?? []} calendarColors={calendarColors} />;
}

function CalendarUnconfigured() {
  return (
    <div className="lens-cal-state">
      <span className="meta-mono lens-cal-state-sub">Pick a calendar — gear icon</span>
    </div>
  );
}

function TodayBody({
  card,
  events,
  calendarColors,
}: {
  card: LayoutCard<GoogleCalendarConfig>;
  events: NormalizedEvent[];
  calendarColors: Map<string, string>;
}) {
  const [now, setNow] = useState<Date | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const didScrollRef = useRef(false);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const initial = setTimeout(tick, 0);
    const id = setInterval(tick, 60_000);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!now || !scrollRef.current || didScrollRef.current) return;
    const nowHour = now.getHours() + now.getMinutes() / 60;
    const top = (nowHour - HOUR_START) * PX_PER_HOUR;
    scrollRef.current.scrollTo({ top: Math.max(0, top - 60), behavior: "auto" });
    didScrollRef.current = true;
  }, [now]);

  const trackHeight = (HOUR_END - HOUR_START) * PX_PER_HOUR;
  const nowOffset =
    now ? (now.getHours() + now.getMinutes() / 60 - HOUR_START) * PX_PER_HOUR : null;
  const showNow = nowOffset !== null && nowOffset >= 0 && nowOffset <= trackHeight;

  const allDay = events.filter((e) => e.allDay);
  const timed = events.filter((e) => !e.allDay);
  const lanes = useMemo(() => packLanes(timed), [timed]);
  const { isClipped, toggleClip } = useClips();

  return (
    <div className="lens-cal-today-shell">
      {allDay.length > 0 && (
        <div className="lens-cal-allday-strip">
          {allDay.map((e) => {
            const color = eventColor(e, calendarColors);
            const clipped = isClipped("google-calendar", e.id);
            return (
              <PluginRowDropTarget
                key={e.id}
                card={card}
                targetId={e.id}
                targetMeta={{ calendarId: e.calendarId }}
                className="lens-cal-allday-chip"
                style={{
                  background: `color-mix(in oklab, ${color} 18%, var(--surface-alt))`,
                  borderLeftColor: color,
                }}
                title={e.title}
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
                {extractLeadingTags(e.description).map((t, i) => (
                  <span key={i} className="lens-cal-event-tag">{t}</span>
                ))}
                {e.title}
              </PluginRowDropTarget>
            );
          })}
        </div>
      )}
      <div ref={scrollRef} className="lens-cal-today-scroll">
        <div className="lens-cal-today-track" style={{ height: trackHeight }}>
        {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i).map((h) => (
          <div
            key={h}
            className="lens-cal-today-row"
            style={{ top: (h - HOUR_START) * PX_PER_HOUR, height: PX_PER_HOUR }}
          >
            <span
              className="meta-mono lens-cal-today-hour"
              style={{ width: TIME_GUTTER }}
            >
              {h.toString().padStart(2, "0")}
            </span>
            <div className="lens-cal-today-rule" />
          </div>
        ))}
        {timed.map((e) => {
          const startHour = hoursOfDay(e.start);
          const endHour = hoursOfDay(e.end);
          const top = (startHour - HOUR_START) * PX_PER_HOUR;
          const height = Math.max(36, (endHour - startHour) * PX_PER_HOUR - 2);
          const color = eventColor(e, calendarColors);
          const placement = lanes.get(e.id) ?? { lane: 0, laneCount: 1 };
          const laneFrac = 1 / placement.laneCount;
          const left = `calc(${TIME_GUTTER}px + (100% - ${TIME_GUTTER}px) * ${placement.lane * laneFrac})`;
          const width = `calc((100% - ${TIME_GUTTER}px) * ${laneFrac} - var(--sp-1))`;
          const clipped = isClipped("google-calendar", e.id);
          return (
            <PluginRowDropTarget
              key={e.id}
              card={card}
              targetId={e.id}
              targetMeta={{ calendarId: e.calendarId }}
              className="lens-cal-today-event"
              style={{
                top,
                left,
                width,
                height,
                background: `color-mix(in oklab, ${color} 18%, var(--surface-alt))`,
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
              <span className="lens-cal-today-event-title">{e.title}</span>
              {height >= 44 && (
                <span className="meta-mono lens-cal-today-event-time">
                  {formatHour(startHour)}–{formatHour(endHour)}
                </span>
              )}
              {(() => {
                const tags = extractLeadingTags(e.description);
                if (tags.length === 0) return null;
                return (
                  <div className="lens-cal-event-tags">
                    {tags.map((t, i) => (
                      <span key={i} className="lens-cal-event-tag">{t}</span>
                    ))}
                  </div>
                );
              })()}
            </PluginRowDropTarget>
          );
        })}
        {showNow && (
          <div className="lens-cal-today-now" style={{ top: nowOffset! }}>
            <span
              className="lens-cal-today-now-dot"
              style={{ marginLeft: TIME_GUTTER - 4 }}
            />
            <span className="lens-cal-today-now-line" />
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
