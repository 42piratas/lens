"use client";

import type { LayoutCard } from "@/connectors/types";
import type { GoogleSheetsConfig } from "../manifest";
import { useSheetMetadata } from "../hooks/use-sheet-metadata";

function splitA1(a1: string): { sheetName?: string; range: string } {
  const m = a1.match(/^(?:'([^']+)'|([^'!]+))!(.+)$/);
  if (!m) return { range: a1 };
  return { sheetName: m[1] ?? m[2], range: m[3] };
}

function buildSheetHref(
  spreadsheetId: string,
  a1: string | undefined,
  sheets: { id: number; title: string }[],
): string {
  const base = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  if (!a1) return base;
  const { sheetName, range } = splitA1(a1);
  const gid =
    sheetName !== undefined
      ? sheets.find((s) => s.title === sheetName)?.id
      : undefined;
  if (gid !== undefined) return `${base}#gid=${gid}&range=${encodeURI(range)}`;
  return `${base}#range=${encodeURI(a1)}`;
}

export function makeSheetsTopbar(
  getA1: (card: LayoutCard<GoogleSheetsConfig>) => string | undefined,
) {
  return function SheetsTopbar({ card }: { card: LayoutCard<GoogleSheetsConfig> }) {
    const id = card.config.spreadsheetId;
    const a1 = getA1(card);
    const { data } = useSheetMetadata(id);
    const label =
      card.config.label?.toUpperCase() ?? a1?.toUpperCase() ?? "SHEET";
    if (!id) {
      return (
        <span className="lens-card-topbar-label-wrap">
          <span className="lens-card-topbar-label" title={label}>
            {label}
          </span>
        </span>
      );
    }
    const href = buildSheetHref(id, a1, data?.sheets ?? []);
    return (
      <span className="lens-card-topbar-label-wrap">
        <a
          className="lens-card-topbar-label"
          data-link="true"
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          title={label}
        >
          {label}
        </a>
      </span>
    );
  };
}
