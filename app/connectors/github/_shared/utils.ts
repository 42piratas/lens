import type { GhStatus } from "../types";

const REPO_RE = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;
const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

export function isValidRepo(s: string): boolean {
  return REPO_RE.test(s);
}

export function isValidOwner(s: string): boolean {
  return OWNER_RE.test(s);
}

/** Compact relative age from an ISO timestamp, e.g. "now", "5m", "3h", "2d", "4w". */
export function relativeAge(iso: string, now: number = Date.now()): string {
  if (!iso) return "";
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "";
  const secs = Math.max(0, Math.floor((now - then) / 1000));
  if (secs < 60) return "now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 52) return `${weeks}w`;
  return `${Math.floor(days / 365)}y`;
}

/** Maps a rolled-up CI status to its DS-tokened modifier class. */
export function statusModifier(status: GhStatus): string {
  return `lens-gh-status--${status}`;
}

export function statusLabel(status: GhStatus): string {
  switch (status) {
    case "success":
      return "checks passing";
    case "failure":
      return "checks failing";
    case "pending":
      return "checks pending";
    default:
      return "no checks";
  }
}
