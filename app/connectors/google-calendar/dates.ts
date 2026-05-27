export type StartOfWeek = "mon" | "sun";

export function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function endOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function startOfWeek(d: Date, mode: StartOfWeek): Date {
  const out = startOfDay(d);
  const dow = out.getDay();
  const offset = mode === "mon" ? (dow + 6) % 7 : dow;
  return addDays(out, -offset);
}

export function startOfMonth(d: Date): Date {
  const out = startOfDay(d);
  out.setDate(1);
  return out;
}

export function startOfNextMonth(d: Date): Date {
  const out = startOfMonth(d);
  out.setMonth(out.getMonth() + 1);
  return out;
}

export function diffDays(a: Date, b: Date): number {
  const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

export function rangeForView(args: {
  view: "today" | "week" | "month" | "macro";
  weeks?: number;
  startOfWeek?: StartOfWeek;
  now: Date;
}): { timeMin: string; timeMax: string } {
  const sow = args.startOfWeek ?? "mon";
  switch (args.view) {
    case "today": {
      const a = startOfDay(args.now);
      const b = endOfDay(args.now);
      return { timeMin: a.toISOString(), timeMax: b.toISOString() };
    }
    case "week": {
      const a = startOfWeek(args.now, sow);
      const b = addDays(a, 7);
      return { timeMin: a.toISOString(), timeMax: b.toISOString() };
    }
    case "month": {
      const a = startOfMonth(args.now);
      const b = startOfNextMonth(args.now);
      return { timeMin: a.toISOString(), timeMax: b.toISOString() };
    }
    case "macro": {
      const a = startOfWeek(args.now, sow);
      const weeks = clamp(args.weeks ?? 6, 2, 12);
      const b = addDays(a, weeks * 7);
      return { timeMin: a.toISOString(), timeMax: b.toISOString() };
    }
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
