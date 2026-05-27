import type { NormalizedTrelloCard, TrelloLabelColor } from "../types";

export function isPastDue(c: NormalizedTrelloCard, now: Date = new Date()): boolean {
  if (!c.due || c.dueComplete) return false;
  return new Date(c.due).getTime() < now.getTime();
}

export function formatDueShort(iso: string, now: Date = new Date()): string {
  const due = new Date(iso);
  const sameYear = due.getFullYear() === now.getFullYear();
  const month = due.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const day = due.getDate();
  if (!sameYear) return `${month} ${day} ${due.getFullYear()}`;
  return `${month} ${day}`;
}

export function labelClass(color: TrelloLabelColor): string {
  if (!color) return "lens-trello-label--gray";
  return `lens-trello-label--${color}`;
}
