"use client";

import type { IntegrationErrorKind } from "../types";

export function TrelloSkeleton() {
  return (
    <div className="lens-cal-state">
      <span className="meta-mono lens-cal-state-loading">Loading…</span>
    </div>
  );
}

const ERROR_LABEL: Record<IntegrationErrorKind, string> = {
  auth: "Sign-in expired",
  "rate-limit": "Rate limit",
  network: "Network",
  unknown: "Error",
  "not-found": "Not found",
};

export function TrelloErrorPill({ error }: { error: unknown }) {
  const kind = (error as { kind?: IntegrationErrorKind })?.kind ?? "unknown";
  return (
    <div className="lens-cal-state">
      <div className="lens-cal-state-stack">
        <span className="meta-mono lens-cal-error-pill">{ERROR_LABEL[kind]}</span>
        <span className="meta-mono lens-cal-state-sub">Trello unavailable</span>
      </div>
    </div>
  );
}

export function TrelloUnconfigured({ hint }: { hint?: string }) {
  return (
    <div className="lens-cal-state">
      <span className="meta-mono lens-cal-state-sub">{hint ?? "Pick a board — gear icon"}</span>
    </div>
  );
}
