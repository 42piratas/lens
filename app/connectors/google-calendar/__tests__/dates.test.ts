import { describe, expect, it } from "vitest";
import { rangeForView, startOfWeek, addDays, diffDays } from "@/connectors/google-calendar/dates";

describe("google-calendar/dates", () => {
  it("startOfWeek mon vs sun", () => {
    const sat = new Date(2026, 4, 2, 12, 0, 0);
    expect(startOfWeek(sat, "mon").getDate()).toBe(27);
    expect(startOfWeek(sat, "sun").getDate()).toBe(26);
  });

  it("rangeForView today", () => {
    const now = new Date(2026, 4, 2, 14, 30, 0);
    const r = rangeForView({ view: "today", now });
    const min = new Date(r.timeMin);
    const max = new Date(r.timeMax);
    expect(min.getHours()).toBe(0);
    expect(max.getHours()).toBe(23);
    expect(diffDays(max, min)).toBe(0);
  });

  it("rangeForView week mon", () => {
    const now = new Date(2026, 4, 2, 14, 30, 0);
    const r = rangeForView({ view: "week", now, startOfWeek: "mon" });
    const min = new Date(r.timeMin);
    const max = new Date(r.timeMax);
    expect(min.getDay()).toBe(1);
    expect(diffDays(max, min)).toBe(7);
  });

  it("rangeForView macro 6 weeks default", () => {
    const now = new Date(2026, 4, 2, 14, 30, 0);
    const r = rangeForView({ view: "macro", now });
    const min = new Date(r.timeMin);
    const max = new Date(r.timeMax);
    expect(diffDays(max, min)).toBe(42);
  });

  it("rangeForView macro clamps weeks", () => {
    const now = new Date(2026, 4, 2);
    const small = rangeForView({ view: "macro", now, weeks: 1 });
    expect(diffDays(new Date(small.timeMax), new Date(small.timeMin))).toBe(14);
    const big = rangeForView({ view: "macro", now, weeks: 99 });
    expect(diffDays(new Date(big.timeMax), new Date(big.timeMin))).toBe(84);
  });

  it("addDays handles month boundary", () => {
    const d = new Date(2026, 4, 31);
    expect(addDays(d, 1).getMonth()).toBe(5);
  });
});
