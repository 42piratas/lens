"use client";

import { useQuery } from "@tanstack/react-query";
import type { IntegrationErrorKind, KeepLabel, KeepNote } from "../types";

type ApiError = { kind: IntegrationErrorKind; message: string };

async function fetchNotes(label?: string): Promise<KeepNote[]> {
  const qs = label ? `?label=${encodeURIComponent(label)}` : "";
  const res = await fetch(`/api/keep/notes${qs}`);
  const text = await res.text();
  const json = text ? (JSON.parse(text) as { data?: KeepNote[]; error?: ApiError }) : {};
  if (!res.ok) {
    const err: ApiError = json.error ?? { kind: "unknown", message: text || res.statusText };
    throw Object.assign(new Error(err.message), { kind: err.kind });
  }
  return json.data ?? [];
}

async function fetchLabels(): Promise<KeepLabel[]> {
  const res = await fetch(`/api/keep/labels`);
  const text = await res.text();
  const json = text ? (JSON.parse(text) as { data?: KeepLabel[]; error?: ApiError }) : {};
  if (!res.ok) {
    const err: ApiError = json.error ?? { kind: "unknown", message: text || res.statusText };
    throw Object.assign(new Error(err.message), { kind: err.kind });
  }
  return json.data ?? [];
}

export function useKeepNotes(args: { label?: string }, enabled = true) {
  return useQuery({
    queryKey: ["keep", "notes", args.label ?? null],
    queryFn: () => fetchNotes(args.label),
    enabled,
  });
}

export function useKeepLabels(enabled = true) {
  return useQuery({
    queryKey: ["keep", "labels"],
    queryFn: fetchLabels,
    enabled,
  });
}
