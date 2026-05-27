"use client";

import { useEffect } from "react";
import type { TileManifest } from "@/tiles/types";
import type { GoogleTasksConfig } from "./manifest";
import { useGoogleTasklists } from "./hooks/use-tasklists";

type Props = {
  config: GoogleTasksConfig;
  tile: TileManifest<GoogleTasksConfig>;
  onChange: (next: GoogleTasksConfig) => void;
};

export function ConfigBody({ config, tile, onChange }: Props) {
  const isList = tile.id === "task-list";
  const isDue = tile.id === "task-due";
  const showTasklistPicker = isList;
  const { data: tasklistsRaw, isLoading, error } = useGoogleTasklists();
  const tasklists = tasklistsRaw ?? [];

  const set = <K extends keyof GoogleTasksConfig>(key: K, value: GoogleTasksConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  const handleTasklistChange = (id: string) => {
    const t = tasklists.find((x) => x.id === id);
    onChange({
      ...config,
      tasklistId: id || undefined,
      tasklistTitle: t?.title,
    });
  };

  useEffect(() => {
    if (!isList && (config.tasklistId || config.tasklistTitle)) {
      onChange({ ...config, tasklistId: undefined, tasklistTitle: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tile.id]);

  useEffect(() => {
    if (isList && config.tasklistId && tasklists.length > 0) {
      const stillValid = tasklists.some((t) => t.id === config.tasklistId);
      if (!stillValid) {
        onChange({ ...config, tasklistId: undefined, tasklistTitle: undefined });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tile.id, tasklists.length, config.tasklistId]);

  const showCompleted = config.showCompleted ?? false;
  const showHidden = config.showHidden ?? false;
  const lookahead = config.lookaheadDays ?? 14;
  const dueFilter = config.dueFilter ?? "all";

  return (
    <div className="lens-panel-fields">
      {showTasklistPicker && (
        <label className="lens-panel-field">
          <span className="tile-label">Tasklist</span>
          {isLoading ? (
            <span className="meta-mono lens-panel-field-loading">Loading…</span>
          ) : error ? (
            <span className="meta-mono lens-panel-field-error">Couldn&apos;t load tasklists</span>
          ) : (
            <select
              value={config.tasklistId ?? ""}
              onChange={(e) => handleTasklistChange(e.target.value)}
              className="lens-panel-select"
            >
              <option value="" disabled>
                Pick a tasklist…
              </option>
              {tasklists.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          )}
        </label>
      )}

      {isList && (
        <label className="lens-panel-field">
          <span className="tile-label">Show completed</span>
          <div className="lens-panel-segmented">
            {(["off", "on"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => set("showCompleted", v === "on")}
                aria-pressed={showCompleted === (v === "on")}
                className="lens-panel-segmented-btn"
                data-active={showCompleted === (v === "on") ? "true" : undefined}
              >
                {v === "on" ? "On" : "Off"}
              </button>
            ))}
          </div>
        </label>
      )}

      {isDue && (
        <label className="lens-panel-field">
          <span className="tile-label">Window</span>
          <span className="meta-mono lens-panel-field-helper">{lookahead} days</span>
          <input
            type="range"
            min={1}
            max={60}
            step={1}
            value={lookahead}
            onChange={(e) => set("lookaheadDays", Number(e.target.value))}
            className="lens-panel-range"
          />
        </label>
      )}

      <label className="lens-panel-field">
        <span className="tile-label">Due filter</span>
        <div className="lens-panel-segmented">
          {(["all", "today"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => set("dueFilter", v)}
              aria-pressed={dueFilter === v}
              className="lens-panel-segmented-btn"
              data-active={dueFilter === v ? "true" : undefined}
            >
              {v === "all" ? "All" : "Today"}
            </button>
          ))}
        </div>
      </label>

      <label className="lens-panel-field">
        <span className="tile-label">Show hidden</span>
        <div className="lens-panel-segmented">
          {(["off", "on"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => set("showHidden", v === "on")}
              aria-pressed={showHidden === (v === "on")}
              className="lens-panel-segmented-btn"
              data-active={showHidden === (v === "on") ? "true" : undefined}
            >
              {v === "on" ? "On" : "Off"}
            </button>
          ))}
        </div>
      </label>
    </div>
  );
}
