"use client";

import type { IntegrationErrorKind } from "../types";

export function KeepSkeleton() {
  return (
    <div className="lens-cal-state">
      <span className="meta-mono lens-cal-state-loading">Loading…</span>
    </div>
  );
}

const ERROR_LABEL: Record<IntegrationErrorKind, string> = {
  auth: "Workspace required",
  "rate-limit": "Rate limit",
  network: "Network error",
  unknown: "Error",
  "not-found": "Not found",
};

export function KeepErrorPill({ error }: { error: unknown }) {
  const kind = (error as { kind?: IntegrationErrorKind })?.kind ?? "unknown";
  const message = (error as { message?: string })?.message ?? "";
  // Surface a hint that distinguishes Workspace-gate failures (403) from
  // generic auth expiry. The client.ts error message carries "Workspace" when
  // Google returns 403 for non-Workspace tokens.
  const isWorkspaceMissing = kind === "auth" && /workspace/i.test(message);
  const sub =
    isWorkspaceMissing
      ? "Google Keep requires a Workspace account"
      : kind === "auth"
        ? "Reconnect Google in /settings"
        : kind === "network"
          ? "Could not reach the Keep API"
          : "Notes unavailable";
  return (
    <div className="lens-cal-state">
      <div className="lens-cal-state-stack">
        <span className="meta-mono lens-cal-error-pill">
          {isWorkspaceMissing ? "Workspace required" : ERROR_LABEL[kind]}
        </span>
        <span className="meta-mono lens-cal-state-sub">{sub}</span>
      </div>
    </div>
  );
}

export function KeepUnconfigured({ hint }: { hint: string }) {
  return (
    <div className="lens-cal-state">
      <span className="meta-mono lens-cal-state-sub">{hint}</span>
    </div>
  );
}

export function KeepEmpty({ hint }: { hint: string }) {
  return (
    <div className="lens-cal-state">
      <span className="meta-mono lens-cal-state-sub">{hint}</span>
    </div>
  );
}
