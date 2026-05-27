"use client";

import { useState } from "react";
import { useScratchpad } from "@/lib/hooks/use-scratchpad";
import type { TileManifest } from "@/tiles/types";
import type { ScratchpadConfig } from "./manifest";

type Props = {
  config: ScratchpadConfig;
  tile: TileManifest<ScratchpadConfig>;
  onChange: (next: ScratchpadConfig) => void;
};

const DEBUG_FLAG = process.env.NEXT_PUBLIC_LENS_DEBUG === "1";

export function ConfigBody(_props: Props) {
  const { state, setBinding, clearBinding } = useScratchpad();
  const [confirming, setConfirming] = useState(false);
  const bound = state.binding !== null;

  return (
    <div className="lens-panel-fields">
      <div className="lens-panel-field">
        <span className="tile-label">Binding</span>
        <span className="meta-mono lens-panel-field-helper">
          {bound
            ? `${state.binding!.parentTitle ?? state.binding!.connector} | ${state.binding!.sourceTitle}`
            : "No source bound"}
        </span>
      </div>

      <div className="lens-panel-field">
        {confirming ? (
          <div className="lens-panel-segmented">
            <button
              type="button"
              className="lens-panel-segmented-btn"
              data-active="true"
              onClick={() => {
                clearBinding();
                setConfirming(false);
              }}
            >
              Confirm clear
            </button>
            <button
              type="button"
              className="lens-panel-segmented-btn"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="lens-panel-segmented-btn"
            disabled={!bound}
            onClick={() => setConfirming(true)}
          >
            Clear binding
          </button>
        )}
      </div>

      {DEBUG_FLAG && (
        <div className="lens-panel-field">
          <span className="tile-label">Debug</span>
          <button
            type="button"
            className="lens-panel-segmented-btn"
            onClick={() => {
              setBinding({
                connector: "trello",
                sourceId: `sample-${Date.now()}`,
                sourceTitle: "Sample card",
                parentTitle: "SAMPLE LIST",
                originalContent: "Lorem ipsum dolor sit amet.",
              });
            }}
          >
            Bind sample source
          </button>
          <span className="meta-mono lens-panel-field-helper">
            NEXT_PUBLIC_LENS_DEBUG=1 — removed in production builds.
          </span>
        </div>
      )}
    </div>
  );
}
