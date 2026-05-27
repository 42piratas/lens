"use client";

import { useQuery } from "@tanstack/react-query";
import type { IntegrationErrorKind } from "../types";

type ApiError = { kind: IntegrationErrorKind; message: string };
type SheetMetadata = { sheets: { id: number; title: string }[] };

async function fetchMetadata(spreadsheetId: string): Promise<SheetMetadata> {
  const params = new URLSearchParams({ spreadsheetId });
  const res = await fetch(`/api/google/sheets/metadata?${params.toString()}`);
  const text = await res.text();
  const json = text ? (JSON.parse(text) as { data?: SheetMetadata; error?: ApiError }) : {};
  if (!res.ok) {
    const err: ApiError = json.error ?? { kind: "unknown", message: text || res.statusText };
    throw Object.assign(new Error(err.message), { kind: err.kind });
  }
  return json.data ?? { sheets: [] };
}

export function useSheetMetadata(spreadsheetId: string | undefined) {
  return useQuery({
    queryKey: ["google-sheets", "metadata", spreadsheetId],
    queryFn: () => fetchMetadata(spreadsheetId as string),
    enabled: Boolean(spreadsheetId),
  });
}
