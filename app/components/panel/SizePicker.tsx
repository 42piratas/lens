"use client";

import type { TileManifest } from "@/tiles/types";

export type SizeError = string | null;

const MIN_DIM = 2;
const MAX_DIM = 20;

export function getSizeError(
  tile: TileManifest<unknown> | undefined,
  w: number | undefined,
  h: number | undefined,
): SizeError {
  if (!tile) return null;
  if (w === undefined || h === undefined) return null;
  if (!Number.isFinite(w) || !Number.isFinite(h)) return "Width and height must be whole numbers.";
  if (!Number.isInteger(w) || !Number.isInteger(h)) return "Width and height must be whole numbers.";
  if (w < MIN_DIM || h < MIN_DIM) return `Minimum is ${MIN_DIM}×${MIN_DIM}.`;
  if (w > MAX_DIM || h > MAX_DIM) return `Out of grid bounds (${MIN_DIM}–${MAX_DIM}).`;
  return null;
}

export function SizePicker({
  tile,
  w,
  h,
  onChange,
}: {
  tile: TileManifest<unknown> | undefined;
  w: number | undefined;
  h: number | undefined;
  onChange: (next: { w: number; h: number }) => void;
}) {
  const error = getSizeError(tile, w, h);

  return (
    <div className="lens-panel-section">
      <span className="tile-label">Size</span>
      <div className="lens-panel-size-row">
        <label className="lens-panel-size-input">
          <span className="meta-mono">W</span>
          <input
            type="number"
            min={MIN_DIM}
            max={MAX_DIM}
            value={w ?? ""}
            disabled={!tile}
            onChange={(e) =>
              onChange({ w: parseInt(e.target.value, 10), h: h ?? MIN_DIM })
            }
          />
        </label>
        <span className="lens-panel-size-x" aria-hidden>×</span>
        <label className="lens-panel-size-input">
          <span className="meta-mono">H</span>
          <input
            type="number"
            min={MIN_DIM}
            max={MAX_DIM}
            value={h ?? ""}
            disabled={!tile}
            onChange={(e) =>
              onChange({ w: w ?? MIN_DIM, h: parseInt(e.target.value, 10) })
            }
          />
        </label>
      </div>
      {error && <span className="lens-panel-error">{error}</span>}
    </div>
  );
}
