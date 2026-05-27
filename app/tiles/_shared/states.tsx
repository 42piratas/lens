"use client";

import { IntegrationError } from "@/connectors/_shared/integration-error";

export function TileSkeleton() {
  return (
    <div className="lens-cal-state">
      <span className="meta-mono lens-cal-state-sub">Loading…</span>
    </div>
  );
}

export function TileUnconfigured({ hint }: { hint: string }) {
  return (
    <div className="lens-cal-state">
      <span className="meta-mono lens-cal-state-sub">{hint}</span>
    </div>
  );
}

export function TileEmpty({ hint }: { hint: string }) {
  return (
    <div className="lens-cal-state">
      <span className="meta-mono lens-cal-state-sub">{hint}</span>
    </div>
  );
}

export function TileErrorPill({ error }: { error: unknown }) {
  const headline =
    error instanceof IntegrationError
      ? labelForKind(error.kind)
      : "Couldn't load data";
  const detail = error instanceof Error ? error.message : undefined;
  return (
    <div className="lens-cal-state">
      <span className="meta-mono lens-cal-state-sub">{headline}</span>
      {detail && <span className="meta-mono lens-cal-state-sub">{detail}</span>}
    </div>
  );
}

function labelForKind(kind: IntegrationError["kind"]): string {
  switch (kind) {
    case "auth":
      return "Sign-in needed — check connector setup";
    case "rate-limit":
      return "Rate-limited — try again shortly";
    case "network":
      return "Network error";
    default:
      return "Couldn't load data";
  }
}
