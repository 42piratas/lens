"use client";

import { IntegrationError } from "@/connectors/_shared/integration-error";

export function GithubSkeleton() {
  return (
    <div className="lens-cal-state">
      <span className="meta-mono lens-cal-state-sub">Loading…</span>
    </div>
  );
}

export function GithubUnconfigured({ hint }: { hint: string }) {
  return (
    <div className="lens-cal-state">
      <span className="meta-mono lens-cal-state-sub">{hint}</span>
    </div>
  );
}

export function GithubEmpty({ hint }: { hint: string }) {
  return (
    <div className="lens-cal-state">
      <span className="meta-mono lens-cal-state-sub">{hint}</span>
    </div>
  );
}

function kindOf(error: unknown): string | undefined {
  if (error instanceof IntegrationError) return error.kind;
  if (error && typeof error === "object" && "kind" in error) {
    return String((error as { kind: unknown }).kind);
  }
  return undefined;
}

export function GithubErrorPill({ error }: { error: unknown }) {
  const kind = kindOf(error);
  const headline = headlineForKind(kind);
  const detail = error instanceof Error ? error.message : undefined;
  return (
    <div className="lens-cal-state">
      <span className="meta-mono lens-cal-state-sub">{headline}</span>
      {detail && <span className="meta-mono lens-cal-state-sub">{detail}</span>}
    </div>
  );
}

function headlineForKind(kind: string | undefined): string {
  switch (kind) {
    case "auth":
      return "GitHub not connected — connect in Settings";
    case "rate-limit":
      return "GitHub rate-limited — try again shortly";
    case "not-found":
      return "Repo not in your GitHub connection";
    case "network":
      return "Network error";
    default:
      return "Couldn't load GitHub data";
  }
}
