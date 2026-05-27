"use client";

import type { TileAdapter } from "@/tiles/types";
import type { BadgesWithDescriptionsData } from "@/tiles/badges-with-descriptions/types";
import type { GoogleSheetsConfig } from "../manifest";
import { useSheetsRange } from "../hooks/use-range";

function asString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  return String(v);
}

export const badgesWithDescriptionsAdapter: TileAdapter<
  GoogleSheetsConfig,
  BadgesWithDescriptionsData
> = {
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
    const rawBody = treatFirstRowAsHeader ? rows.slice(1) : rows;
    const bodyRows = reverseRows ? [...rawBody].reverse() : rawBody;
    const items = bodyRows
      .map((row, i) => {
        const name = asString(row[0]).trim();
        const description = asString(row[1]).trim();
        if (!name && !description) return null;
        return { id: `b-${i}`, name, description };
      })
      .filter((x): x is { id: string; name: string; description: string } => Boolean(x));

    return { data: items, isLoading, error };
  },
  topbarLabel: (card) =>
    card.config.label?.toUpperCase() ??
    card.config.range?.toUpperCase() ??
    "BADGES",
  topbarHref: (card) => {
    const id = card.config.spreadsheetId;
    if (!id) return undefined;
    return `https://docs.google.com/spreadsheets/d/${id}/edit`;
  },
};
