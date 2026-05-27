"use client";

import type { TileManifest } from "@/tiles/types";
import type { GoogleCalendarConfig } from "./manifest";
import { useCalendars } from "./hooks/use-calendars";

type Props = {
  config: GoogleCalendarConfig;
  tile: TileManifest<GoogleCalendarConfig>;
  onChange: (next: GoogleCalendarConfig) => void;
};

export function ConfigBody({ config, tile, onChange }: Props) {
  const { data: calendars, isLoading, error } = useCalendars();

  const set = <K extends keyof GoogleCalendarConfig>(key: K, value: GoogleCalendarConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  const selected = config.calendarIds ?? [];
  const toggle = (id: string) => {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
    set("calendarIds", next);
  };

  const showStartOfWeek =
    tile.id === "calendar-one-week" ||
    tile.id === "calendar-many-weeks" ||
    tile.id === "calendar-one-month";
  const showWeeks = tile.id === "calendar-many-weeks";
  const sow = config.startOfWeek ?? "mon";
  const weeks = config.weeks ?? 6;

  return (
    <div className="lens-panel-fields">
      <div className="lens-panel-field">
        <span className="tile-label">Calendars</span>
        {isLoading ? (
          <span className="meta-mono lens-panel-field-loading">Loading…</span>
        ) : error ? (
          <span className="meta-mono lens-panel-field-error">Couldn&apos;t load calendars</span>
        ) : (
          <div className="lens-panel-checklist">
            {calendars?.map((c) => {
              const checked = selected.includes(c.id);
              return (
                <label
                  key={c.id}
                  className="lens-panel-checklist-row"
                  data-active={checked ? "true" : undefined}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(c.id)}
                  />
                  <span>{c.name}{c.primary ? " (primary)" : ""}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {showStartOfWeek && (
        <div className="lens-panel-field">
          <span className="tile-label">Start of week</span>
          <div className="lens-panel-segmented">
            {(["mon", "sun"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set("startOfWeek", s)}
                aria-pressed={sow === s}
                className="lens-panel-segmented-btn"
                data-active={sow === s ? "true" : undefined}
              >
                {s === "mon" ? "Monday" : "Sunday"}
              </button>
            ))}
          </div>
        </div>
      )}

      {showWeeks && (
        <label className="lens-panel-field">
          <span className="tile-label">Weeks</span>
          <span className="meta-mono lens-panel-field-helper">{weeks} weeks</span>
          <input
            type="range"
            min={2}
            max={12}
            step={1}
            value={weeks}
            onChange={(e) => set("weeks", Number(e.target.value))}
            className="lens-panel-range"
          />
        </label>
      )}
    </div>
  );
}
