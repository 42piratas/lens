"use client";

import { useMemo } from "react";
import { useCalendars } from "./use-calendars";

export function useCalendarColors(): Map<string, string> {
  const { data } = useCalendars();
  return useMemo(() => {
    const m = new Map<string, string>();
    for (const c of data ?? []) {
      if (c.backgroundColor) m.set(c.id, c.backgroundColor);
    }
    return m;
  }, [data]);
}
