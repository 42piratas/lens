"use client";

import type { LayoutCard } from "@/connectors/types";
import type { GoogleSheetsConfig } from "@/connectors/google-sheets/manifest";
import { useSheetsRange } from "@/connectors/google-sheets/hooks/use-range";
import {
  SheetsErrorPill,
  SheetsSkeleton,
  SheetsUnconfigured,
} from "@/connectors/google-sheets/_shared/states";
import { formatCell } from "@/connectors/google-sheets/_shared/utils";
import { useClips } from "@/lib/dnd-payloads/use-clips";

/** Parse the start cell of an A1 range — `Sheet1!B3:E20` → `{ col: 1, row: 2 }`
 *  (zero-based). Returns null when the range can't be parsed; callers fall
 *  back to a synthetic `r{row}c{col}` reference rather than reporting an error
 *  on the click path. */
function parseRangeStart(
  range: string,
): { col: number; row: number; sheet?: string } | null {
  const stripped = range.includes("!") ? range.split("!")[1]! : range;
  const start = stripped.split(":")[0]!;
  const m = /^([A-Za-z]+)(\d+)$/.exec(start);
  if (!m) return null;
  const colLetters = m[1]!.toUpperCase();
  const row = parseInt(m[2]!, 10) - 1;
  let col = 0;
  for (let i = 0; i < colLetters.length; i += 1) {
    col = col * 26 + (colLetters.charCodeAt(i) - 64);
  }
  col -= 1;
  const sheet = range.includes("!") ? range.split("!")[0] : undefined;
  return { col, row, sheet };
}

function colA1(col: number): string {
  let c = col;
  let s = "";
  while (c >= 0) {
    s = String.fromCharCode(65 + (c % 26)) + s;
    c = Math.floor(c / 26) - 1;
  }
  return s;
}

function cellA1(
  start: { col: number; row: number; sheet?: string },
  rOffset: number,
  cOffset: number,
): string {
  const a = `${colA1(start.col + cOffset)}${start.row + rOffset + 1}`;
  return start.sheet ? `${start.sheet}!${a}` : a;
}

export function GoogleSheetsRangeTile({ card }: { card: LayoutCard<GoogleSheetsConfig> }) {
  const {
    spreadsheetId,
    range,
    treatFirstRowAsHeader = true,
    reverseRows = false,
  } = card.config;
  const enabled = Boolean(spreadsheetId && range);
  const { data, isLoading, error } = useSheetsRange(
    { spreadsheetId: spreadsheetId ?? "", range: range ?? "" },
    enabled,
  );
  const { isClipped, toggleClip } = useClips();

  if (!enabled) {
    return <SheetsUnconfigured hint="Set spreadsheet ID + range — gear icon" />;
  }
  if (isLoading) return <SheetsSkeleton />;
  if (error) return <SheetsErrorPill error={error} />;

  const rows = data?.values ?? [];
  if (rows.length === 0) {
    return <SheetsUnconfigured hint="Range returned no data" />;
  }

  const header = treatFirstRowAsHeader ? rows[0] : null;
  const rawBody = treatFirstRowAsHeader ? rows.slice(1) : rows;
  const body = reverseRows ? [...rawBody].reverse() : rawBody;
  const colCount = Math.max(...rows.map((r) => r.length), 0);
  const start = parseRangeStart(range ?? "") ?? { col: 0, row: 0 };
  const headerOffset = treatFirstRowAsHeader ? 1 : 0;
  const sid = spreadsheetId ?? "";

  return (
    <div className="lens-card-surface lens-sheets-range-scroll">
      <table className="lens-sheets-range-table">
        {header && (
          <thead>
            <tr>
              {Array.from({ length: colCount }, (_, i) => (
                <th key={i} className="lens-sheets-range-th tile-label">
                  {formatCell(header[i] ?? null)}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {body.map((row, r) => {
            // Render index → original sheet row offset (account for reverse + header).
            const originalRowIdx = reverseRows
              ? rawBody.length - 1 - r + headerOffset
              : r + headerOffset;
            return (
              <tr key={r}>
                {Array.from({ length: colCount }, (_, c) => {
                  const a1 = cellA1(start, originalRowIdx, c);
                  const value = formatCell(row[c] ?? null);
                  const sourceId = `${sid}/${range ?? ""}/${a1}`;
                  const clipped = isClipped("google-sheets", sourceId);
                  return (
                    <td
                      key={c}
                      className="lens-sheets-range-td card-text"
                      data-clipped={clipped ? "true" : undefined}
                    >
                      <button
                        type="button"
                        className="lens-clip-target lens-sheets-range-cell-btn"
                        onClick={() =>
                          toggleClip({
                            kind: "clip-like",
                            label: `${a1}: ${value}`,
                            source: { connector: "google-sheets", sourceId },
                            parentTitle: "SHEETS",
                            originalContent: value,
                          })
                        }
                      >
                        {value}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
