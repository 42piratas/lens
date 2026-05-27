"use client";

import type { ConnectorManifest } from "@/connectors/types";

export function ConnectorPicker({
  connectors,
  selected,
  disabled,
  onSelect,
}: {
  connectors: ConnectorManifest<unknown>[];
  selected?: string;
  disabled?: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="lens-panel-section">
      <span className="tile-label">Connector</span>
      <div className="lens-panel-list">
        {connectors.map((c) => {
          const active = c.id === selected;
          return (
            <button
              key={c.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(c.id)}
              aria-pressed={active}
              className="lens-panel-option"
              data-active={active ? "true" : undefined}
            >
              <span className="lens-panel-option-icon" aria-hidden>
                {c.icon}
              </span>
              <span className="lens-panel-option-body">
                <span className="tile-label">{c.name}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
