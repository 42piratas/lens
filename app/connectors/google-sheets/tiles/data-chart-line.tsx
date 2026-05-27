"use client";

import type { TileAdapter } from "@/tiles/types";
import type {
  ChartLineData,
  ChartLineSeries,
} from "@/tiles/data-chart-line/types";
import type { GoogleSheetsConfig } from "../manifest";
import { useSheetsRange } from "../hooks/use-range";

const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

function coerceY(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim().replace(/,/g, "");
    if (trimmed === "") return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export const dataChartLineAdapter: TileAdapter<GoogleSheetsConfig, ChartLineData> = {
  useData(card) {
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
    if (!data) return { data: undefined, isLoading, error };

    const rows = data.values ?? [];
    if (rows.length === 0) {
      return { data: { series: [] }, isLoading, error };
    }

    const headerRow = treatFirstRowAsHeader ? rows[0] : null;
    const rawBody = treatFirstRowAsHeader ? rows.slice(1) : rows;
    const bodyRows = reverseRows ? [...rawBody].reverse() : rawBody;
    const colCount = Math.max(...rows.map((r) => r.length), 0);
    const seriesCount = Math.max(0, colCount - 1);

    const series: ChartLineSeries[] = [];
    for (let s = 0; s < seriesCount; s++) {
      const colIdx = s + 1;
      const headerRaw = headerRow?.[colIdx];
      const label =
        (typeof headerRaw === "string" ? headerRaw.trim() : String(headerRaw ?? "").trim()) ||
        `Series ${s + 1}`;
      const points = [];
      for (const row of bodyRows) {
        const xRaw = row[0];
        const y = coerceY(row[colIdx]);
        if (xRaw === undefined || xRaw === null || y === null) continue;
        points.push({ x: String(xRaw), y });
      }
      if (points.length === 0) continue;
      series.push({
        id: `s-${s}`,
        label,
        color: SERIES_COLORS[s % SERIES_COLORS.length],
        points,
      });
    }

    const xHeaderRaw = headerRow?.[0];
    const xLabel =
      typeof xHeaderRaw === "string"
        ? xHeaderRaw
        : xHeaderRaw == null
          ? undefined
          : String(xHeaderRaw);

    return {
      data: { series, xLabel },
      isLoading,
      error,
    };
  },
  topbarLabel: (card) =>
    card.config.label?.toUpperCase() ??
    card.config.range?.toUpperCase() ??
    "CHART",
  topbarHref: (card) => {
    const id = card.config.spreadsheetId;
    if (!id) return undefined;
    return `https://docs.google.com/spreadsheets/d/${id}/edit`;
  },
};
