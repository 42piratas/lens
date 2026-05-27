"use client";

import { useQuery } from "@tanstack/react-query";
import type { IntegrationErrorKind, RangeData } from "../types";

type ApiError = { kind: IntegrationErrorKind; message: string };

async function fetchRange(spreadsheetId: string, range: string): Promise<RangeData> {
  const params = new URLSearchParams({ spreadsheetId, range });
  const res = await fetch(`/api/google/sheets/range?${params.toString()}`);
  const text = await res.text();
  const json = text ? (JSON.parse(text) as { data?: RangeData; error?: ApiError }) : {};
  if (!res.ok) {
    const err: ApiError = json.error ?? { kind: "unknown", message: text || res.statusText };
    throw Object.assign(new Error(err.message), { kind: err.kind });
  }
  return json.data ?? { values: [], majorDimension: "ROWS" };
}

export function useSheetsRange(
  args: { spreadsheetId: string; range: string },
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["google-sheets", "range", args.spreadsheetId, args.range],
    queryFn: () => fetchRange(args.spreadsheetId, args.range),
    enabled,
  });
}
