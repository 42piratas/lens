"use client";

import type { LayoutCard } from "@/connectors/types";
import type { GoogleSheetsConfig } from "@/connectors/google-sheets/manifest";
import { useSheetsCell } from "@/connectors/google-sheets/hooks/use-cell";
import {
  SheetsErrorPill,
  SheetsSkeleton,
  SheetsUnconfigured,
} from "@/connectors/google-sheets/_shared/states";
import { formatCell } from "@/connectors/google-sheets/_shared/utils";

export function GoogleSheetsCellTile({ card }: { card: LayoutCard<GoogleSheetsConfig> }) {
  const { spreadsheetId, cell } = card.config;
  const enabled = Boolean(spreadsheetId && cell);
  const { data, isLoading, error } = useSheetsCell(
    { spreadsheetId: spreadsheetId ?? "", cell: cell ?? "" },
    enabled,
  );

  if (!enabled) {
    return <SheetsUnconfigured hint="Set spreadsheet ID + cell — gear icon" />;
  }
  if (isLoading) return <SheetsSkeleton />;
  if (error) return <SheetsErrorPill error={error} />;

  return (
    <div className="lens-card-surface lens-sheets-cell">
      <span className="big-number lens-sheets-cell-value">
        {formatCell(data ?? null) || "—"}
      </span>
    </div>
  );
}
