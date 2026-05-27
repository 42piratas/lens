"use client";

import { useState } from "react";
import type { TileManifest } from "@/tiles/types";
import type { GoogleSheetsConfig } from "./manifest";
import { isValidA1, isValidSpreadsheetId } from "./_shared/utils";

type Props = {
  config: GoogleSheetsConfig;
  tile: TileManifest<GoogleSheetsConfig>;
  onChange: (next: GoogleSheetsConfig) => void;
};

export function ConfigBody({ config, tile, onChange }: Props) {
  const [idDraft, setIdDraft] = useState(config.spreadsheetId ?? "");
  const [rangeDraft, setRangeDraft] = useState(config.range ?? "");
  const [cellDraft, setCellDraft] = useState(config.cell ?? "");

  const [prevConfig, setPrevConfig] = useState(config);
  if (prevConfig !== config) {
    setPrevConfig(config);
    if (prevConfig.spreadsheetId !== config.spreadsheetId) setIdDraft(config.spreadsheetId ?? "");
    if (prevConfig.range !== config.range) setRangeDraft(config.range ?? "");
    if (prevConfig.cell !== config.cell) setCellDraft(config.cell ?? "");
  }

  const set = <K extends keyof GoogleSheetsConfig>(key: K, value: GoogleSheetsConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  const commitSpreadsheetId = () => {
    const next = idDraft.trim() || undefined;
    if (next === config.spreadsheetId) return;
    if (next && !isValidSpreadsheetId(next)) return;
    onChange({
      ...config,
      spreadsheetId: next,
      range: undefined,
      cell: undefined,
    });
    setRangeDraft("");
    setCellDraft("");
  };

  const commitRange = () => {
    const next = rangeDraft.trim() || undefined;
    if (next === config.range) return;
    if (next && !isValidA1(next)) return;
    set("range", next);
  };

  const commitCell = () => {
    const next = cellDraft.trim() || undefined;
    if (next === config.cell) return;
    if (next && !isValidA1(next)) return;
    set("cell", next);
  };

  const idError = idDraft.trim() !== "" && !isValidSpreadsheetId(idDraft.trim());
  const rangeError = rangeDraft.trim() !== "" && !isValidA1(rangeDraft.trim());
  const cellError = cellDraft.trim() !== "" && !isValidA1(cellDraft.trim());
  const treatHeader = config.treatFirstRowAsHeader ?? true;
  const reverseRows = config.reverseRows ?? false;
  const isCell = tile.id === "data-stat";
  const isRange =
    tile.id === "data-table" ||
    tile.id === "data-chart-line" ||
    tile.id === "badges-with-descriptions";

  return (
    <div className="lens-panel-fields">
      <label className="lens-panel-field">
        <span className="tile-label">Spreadsheet ID</span>
        <input
          type="text"
          inputMode="text"
          spellCheck={false}
          value={idDraft}
          placeholder="1AbC...XyZ"
          onChange={(e) => setIdDraft(e.target.value)}
          onBlur={commitSpreadsheetId}
          className="lens-panel-input"
          aria-invalid={idError ? "true" : undefined}
        />
        <span className="meta-mono lens-panel-field-helper">
          Find it in the sheet URL between /d/ and /edit
        </span>
        {idError && (
          <span className="meta-mono lens-panel-field-error">Invalid spreadsheet ID</span>
        )}
      </label>

      <label className="lens-panel-field">
        <span className="tile-label">Title</span>
        <input
          type="text"
          value={config.label ?? ""}
          placeholder={isCell ? "e.g. Revenue" : "Custom card title"}
          onChange={(e) => set("label", e.target.value || undefined)}
          className="lens-panel-input"
        />
        <span className="meta-mono lens-panel-field-helper">
          Optional — overrides the default card header
        </span>
      </label>

      {isRange && (
        <>
          <label className="lens-panel-field">
            <span className="tile-label">Range</span>
            <input
              type="text"
              spellCheck={false}
              value={rangeDraft}
              placeholder="Sheet1!A1:D20"
              onChange={(e) => setRangeDraft(e.target.value)}
              onBlur={commitRange}
              className="lens-panel-input"
              aria-invalid={rangeError ? "true" : undefined}
            />
            {rangeError && (
              <span className="meta-mono lens-panel-field-error">Invalid A1 range</span>
            )}
          </label>
          <label className="lens-panel-field">
            <span className="tile-label">First row as header</span>
            <div className="lens-panel-segmented">
              {(["on", "off"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => set("treatFirstRowAsHeader", v === "on")}
                  aria-pressed={treatHeader === (v === "on")}
                  className="lens-panel-segmented-btn"
                  data-active={treatHeader === (v === "on") ? "true" : undefined}
                >
                  {v === "on" ? "On" : "Off"}
                </button>
              ))}
            </div>
          </label>
          <label className="lens-panel-field">
            <span className="tile-label">Row order</span>
            <div className="lens-panel-segmented">
              {(["default", "reversed"] as const).map((v) => {
                const active = reverseRows === (v === "reversed");
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set("reverseRows", v === "reversed")}
                    aria-pressed={active}
                    className="lens-panel-segmented-btn"
                    data-active={active ? "true" : undefined}
                  >
                    {v === "default" ? "Default" : "Reversed"}
                  </button>
                );
              })}
            </div>
            <span className="meta-mono lens-panel-field-helper">
              Reverse if your newest data sits at the top of the range.
            </span>
          </label>
        </>
      )}

      {isCell && (
        <label className="lens-panel-field">
          <span className="tile-label">Cell</span>
          <input
            type="text"
            spellCheck={false}
            value={cellDraft}
            placeholder="Sheet1!B5"
            onChange={(e) => setCellDraft(e.target.value)}
            onBlur={commitCell}
            className="lens-panel-input"
            aria-invalid={cellError ? "true" : undefined}
          />
          {cellError && (
            <span className="meta-mono lens-panel-field-error">Invalid A1 cell</span>
          )}
        </label>
      )}
    </div>
  );
}
