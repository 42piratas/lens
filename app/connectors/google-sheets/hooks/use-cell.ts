"use client";

import { useQuery } from "@tanstack/react-query";
import type { CellValue, IntegrationErrorKind } from "../types";

type ApiError = { kind: IntegrationErrorKind; message: string };

async function fetchCell(spreadsheetId: string, cell: string): Promise<CellValue> {
  const params = new URLSearchParams({ spreadsheetId, cell });
  const res = await fetch(`/api/google/sheets/cell?${params.toString()}`);
  const text = await res.text();
  const json = text ? (JSON.parse(text) as { value?: CellValue; error?: ApiError }) : {};
  if (!res.ok) {
    const err: ApiError = json.error ?? { kind: "unknown", message: text || res.statusText };
    throw Object.assign(new Error(err.message), { kind: err.kind });
  }
  return json.value ?? null;
}

export function useSheetsCell(
  args: { spreadsheetId: string; cell: string },
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["google-sheets", "cell", args.spreadsheetId, args.cell],
    queryFn: () => fetchCell(args.spreadsheetId, args.cell),
    enabled,
  });
}
