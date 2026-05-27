import { describe, expect, it } from "vitest";
import { clamp, formatDueShort, isPastDue, startOfDayLocal } from "@/connectors/google-tasks/_shared/utils";

describe("formatDueShort", () => {
  it("renders MMM D in current year", () => {
    const now = new Date("2026-05-04T12:00:00Z");
    const out = formatDueShort("2026-06-15T00:00:00Z", now);
    expect(out).toMatch(/^[A-Z]{3} \d{1,2}$/);
  });
  it("appends year when different", () => {
    const now = new Date("2026-05-04T12:00:00Z");
    const out = formatDueShort("2027-01-10T00:00:00Z", now);
    expect(out).toMatch(/^[A-Z]{3} \d{1,2} 2027$/);
  });
});

describe("isPastDue", () => {
  it("true for past dates", () => {
    expect(isPastDue("2025-01-01T00:00:00Z", new Date("2026-05-04T00:00:00Z"))).toBe(true);
  });
  it("false for future", () => {
    expect(isPastDue("2027-01-01T00:00:00Z", new Date("2026-05-04T00:00:00Z"))).toBe(false);
  });
});

describe("clamp", () => {
  it("clamps below min", () => expect(clamp(-1, 0, 10)).toBe(0));
  it("clamps above max", () => expect(clamp(99, 0, 10)).toBe(10));
  it("passes through in range", () => expect(clamp(5, 0, 10)).toBe(5));
});

describe("startOfDayLocal", () => {
  it("zeroes the time", () => {
    const d = new Date("2026-05-04T18:30:45.123Z");
    const out = startOfDayLocal(d);
    expect(out.getHours()).toBe(0);
    expect(out.getMinutes()).toBe(0);
    expect(out.getSeconds()).toBe(0);
    expect(out.getMilliseconds()).toBe(0);
  });
});
