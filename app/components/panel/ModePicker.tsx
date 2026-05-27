"use client";

import type { TileManifest } from "@/tiles/types";

function rangeHelper(t: TileManifest<unknown>): string {
  if (t.recommendedSize) return `min recommended ${t.recommendedSize.w}×${t.recommendedSize.h}`;
  return `default ${t.defaultSize.w}×${t.defaultSize.h}`;
}

export function ModePicker({
  tiles,
  selected,
  onSelect,
}: {
  tiles: TileManifest<unknown>[];
  selected?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="lens-panel-section">
      <span className="tile-label">Source</span>
      <div className="lens-panel-list">
        {tiles.map((t) => {
          const active = t.id === selected;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              aria-pressed={active}
              className="lens-panel-option"
              data-active={active ? "true" : undefined}
            >
              <span className="lens-panel-option-body">
                <span className="tile-label">{t.label}</span>
                <span className="meta-mono">{rangeHelper(t)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
