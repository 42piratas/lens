// Google Tasks stores `due` as date-only at UTC midnight (`YYYY-MM-DDT00:00:00.000Z`).
// Always read the date components in UTC; otherwise tz shifts (e.g. BRT) report yesterday.
function dueParts(iso: string): { y: number; m: number; d: number } {
  const d = new Date(iso);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() };
}

export function formatDueShort(iso: string, now: Date = new Date()): string {
  const { y, m, d } = dueParts(iso);
  const due = new Date(y, m, d);
  const sameYear = y === now.getFullYear();
  const month = due.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  if (!sameYear) return `${month} ${d} ${y}`;
  return `${month} ${d}`;
}

export function isPastDue(iso: string, now: Date = new Date()): boolean {
  const { y, m, d } = dueParts(iso);
  // End-of-day comparison: a task due "today" is not past due until tomorrow.
  return new Date(y, m, d, 23, 59, 59, 999).getTime() < now.getTime();
}

export function isDueToday(iso: string, now: Date = new Date()): boolean {
  const { y, m, d } = dueParts(iso);
  return y === now.getFullYear() && m === now.getMonth() && d === now.getDate();
}

export function startOfDayLocal(d: Date = new Date()): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
