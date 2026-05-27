"use client";

import type { IntegrationErrorKind } from "../../_shared/integration-error";

export function TraktSkeleton() {
  return (
    <div className="lens-cal-state">
      <span className="meta-mono lens-cal-state-loading">Loading…</span>
    </div>
  );
}

const ERROR_LABEL: Record<IntegrationErrorKind, string> = {
  auth: "Unavailable",
  "rate-limit": "Rate limit",
  network: "Network",
  unknown: "Error",
};

const ERROR_SUB: Record<IntegrationErrorKind, string> = {
  auth: "List is private or not found — v1 supports public lists only",
  "rate-limit": "List unavailable",
  network: "List unavailable",
  unknown: "List unavailable",
};

export function TraktErrorPill({ error }: { error: unknown }) {
  const kind = (error as { kind?: IntegrationErrorKind })?.kind ?? "unknown";
  const message =
    typeof (error as { message?: unknown })?.message === "string"
      ? ((error as { message: string }).message)
      : undefined;
  const isBadKey =
    kind === "auth" && message?.toLowerCase().includes("rejected the api key");
  return (
    <div className="lens-cal-state">
      <div className="lens-cal-state-stack">
        <span className="meta-mono lens-cal-error-pill">{ERROR_LABEL[kind]}</span>
        <span className="meta-mono lens-cal-state-sub">
          {isBadKey
            ? "Trakt rejected the API key — check TRAKT_CLIENT_ID"
            : ERROR_SUB[kind]}
        </span>
      </div>
    </div>
  );
}

export function TraktUnconfigured({ hint }: { hint?: string }) {
  return (
    <div className="lens-cal-state">
      <span className="meta-mono lens-cal-state-sub">
        {hint ?? "Set username + list slug — gear icon"}
      </span>
    </div>
  );
}

export function TraktEmpty({ listName }: { listName: string }) {
  return (
    <div className="lens-cal-state">
      <span className="meta-mono lens-cal-state-sub">
        No items in list &ldquo;{listName}&rdquo;
      </span>
    </div>
  );
}
