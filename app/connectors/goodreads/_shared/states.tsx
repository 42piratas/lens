"use client";

import type { IntegrationErrorKind } from "../../_shared/integration-error";

export function GoodreadsSkeleton() {
  return (
    <div className="lens-cal-state">
      <span className="meta-mono lens-cal-state-loading">Loading…</span>
    </div>
  );
}

// auth = "data inaccessible due to source-side privacy" for this connector;
// see connectors/README.md "External + auth-free notes".
const ERROR_LABEL: Record<IntegrationErrorKind, string> = {
  auth: "Private",
  "rate-limit": "Rate limit",
  network: "Network",
  unknown: "Error",
};
const ERROR_SUB: Record<IntegrationErrorKind, string> = {
  auth: "Goodreads shelf is private — set profile to public",
  "rate-limit": "Shelf unavailable",
  network: "Shelf unavailable",
  unknown: "Shelf unavailable",
};

export function GoodreadsErrorPill({ error }: { error: unknown }) {
  const kind = (error as { kind?: IntegrationErrorKind })?.kind ?? "unknown";
  return (
    <div className="lens-cal-state">
      <div className="lens-cal-state-stack">
        <span className="meta-mono lens-cal-error-pill">{ERROR_LABEL[kind]}</span>
        <span className="meta-mono lens-cal-state-sub">{ERROR_SUB[kind]}</span>
      </div>
    </div>
  );
}

export function GoodreadsUnconfigured({ hint }: { hint?: string }) {
  return (
    <div className="lens-cal-state">
      <span className="meta-mono lens-cal-state-sub">
        {hint ?? "Set user ID + shelf — gear icon"}
      </span>
    </div>
  );
}

export function GoodreadsEmpty({ shelfName }: { shelfName: string }) {
  return (
    <div className="lens-cal-state">
      <span className="meta-mono lens-cal-state-sub">
        No books on shelf &ldquo;{shelfName}&rdquo;
      </span>
    </div>
  );
}
