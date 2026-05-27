import { describe, it, expect } from "vitest";
import { findFirstAvailableSlot } from "@/lib/layout/placement";
import type { LayoutCard } from "@/connectors/types";

const card = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
): LayoutCard => ({
  id,
  connector: "google-calendar",
  tile: "calendar-one-day",
  x,
  y,
  w,
  h,
  config: {},
});

describe("findFirstAvailableSlot", () => {
  it("returns top-left on empty grid", () => {
    expect(findFirstAvailableSlot([], 4, 4)).toEqual({ x: 0, y: 0 });
  });

  it("scans left-to-right then top-to-bottom around an obstacle", () => {
    const cards = [card("a", 0, 0, 4, 4)];
    expect(findFirstAvailableSlot(cards, 4, 4)).toEqual({ x: 4, y: 0 });
  });

  it("wraps to next row when current row has no fit", () => {
    const cards = [
      card("a", 0, 0, 10, 4),
      card("b", 10, 0, 10, 4),
    ];
    expect(findFirstAvailableSlot(cards, 4, 4)).toEqual({ x: 0, y: 4 });
  });

  it("returns null when grid is full", () => {
    const cards = [card("a", 0, 0, 20, 20)];
    expect(findFirstAvailableSlot(cards, 4, 4)).toBeNull();
  });

  it("excludes given id when computing", () => {
    const cards = [card("a", 0, 0, 4, 4)];
    expect(findFirstAvailableSlot(cards, 4, 4, "a")).toEqual({ x: 0, y: 0 });
  });

  it("rejects out-of-bounds sizes", () => {
    expect(findFirstAvailableSlot([], 21, 4)).toBeNull();
    expect(findFirstAvailableSlot([], 4, 0)).toBeNull();
  });
});
