"use client";

import type { TileManifest } from "@/tiles/types";
import type { KeepConfig } from "./manifest";
import { useKeepLabels } from "./hooks/use-notes";

type Props = {
  config: KeepConfig;
  tile: TileManifest<KeepConfig>;
  onChange: (next: KeepConfig) => void;
};

export function ConfigBody({ config, onChange }: Props) {
  const filter = config.filter ?? "recent";
  const labelsEnabled = filter === "label";
  const { data: labels, isLoading, error } = useKeepLabels(labelsEnabled);

  const setFilter = (next: "recent" | "label") => {
    if (next === filter) return;
    if (next === "recent") onChange({ ...config, filter: "recent", label: undefined });
    else onChange({ ...config, filter: "label" });
  };

  return (
    <div className="lens-panel-fields">
      <label className="lens-panel-field">
        <span className="tile-label">Filter</span>
        <div className="lens-panel-segmented">
          {(["recent", "label"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setFilter(v)}
              aria-pressed={filter === v}
              className="lens-panel-segmented-btn"
              data-active={filter === v ? "true" : undefined}
            >
              {v === "recent" ? "Recent" : "By label"}
            </button>
          ))}
        </div>
      </label>

      {labelsEnabled && (
        <label className="lens-panel-field">
          <span className="tile-label">Label</span>
          {isLoading ? (
            <span className="meta-mono lens-panel-field-helper">Loading labels…</span>
          ) : error ? (
            <span className="meta-mono lens-panel-field-error">
              Could not load labels — Workspace required, or no labels in recent notes.
            </span>
          ) : (labels ?? []).length === 0 ? (
            <span className="meta-mono lens-panel-field-helper">
              No labels in this Keep account.
            </span>
          ) : (
            <select
              value={config.label ?? ""}
              onChange={(e) => onChange({ ...config, label: e.target.value || undefined })}
              className="lens-panel-input"
            >
              <option value="">— pick a label —</option>
              {(labels ?? []).map((l) => (
                <option key={l.id} value={l.name}>
                  {l.name}
                </option>
              ))}
            </select>
          )}
        </label>
      )}
    </div>
  );
}
