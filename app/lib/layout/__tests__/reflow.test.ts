import { describe, it, expect } from "vitest";
import { reflowAfterMove } from "@/lib/layout/reflow";
import type { LayoutCard } from "@/connectors/types";

const c = (id: string, x: number, y: number, w: number, h: number): LayoutCard => ({
  id,
  connector: "google-calendar",
  tile: "calendar-one-day",
  x,
  y,
  w,
  h,
  config: {},
});

describe("reflowAfterMove", () => {
  it("moves a card with no collisions", () => {
    const r = reflowAfterMove([c("a", 0, 0, 4, 4)], "a", 8, 0);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.cards.find((x) => x.id === "a")).toMatchObject({ x: 8, y: 0 });
    }
  });

  it("pushes overlapping card to next free slot", () => {
    const cards = [c("a", 0, 0, 4, 4), c("b", 4, 0, 4, 4)];
    const r = reflowAfterMove(cards, "a", 4, 0);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const a = r.cards.find((x) => x.id === "a")!;
      const b = r.cards.find((x) => x.id === "b")!;
      expect(a).toMatchObject({ x: 4, y: 0 });
      expect(b.x === 0 || b.y === 4).toBe(true);
      const overlap =
        a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      expect(overlap).toBe(false);
    }
  });

  it("rejects out-of-bounds move", () => {
    const r = reflowAfterMove([c("a", 0, 0, 4, 4)], "a", 18, 18);
    expect(r.ok).toBe(false);
  });

  it("returns ok:false when no slot exists for a displaced card", () => {
    // grid filled by a + b each 10×20; moving a overlaps b but there is no
    // 10-wide free slot for b to escape into
    const cards = [c("a", 0, 0, 10, 20), c("b", 10, 0, 10, 20)];
    const r = reflowAfterMove(cards, "a", 5, 0);
    expect(r.ok).toBe(false);
  });

  it("cascades into chain pushes", () => {
    const cards = [
      c("a", 0, 0, 4, 4),
      c("b", 4, 0, 4, 4),
      c("c", 8, 0, 4, 4),
    ];
    const r = reflowAfterMove(cards, "a", 4, 0);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const a = r.cards.find((x) => x.id === "a")!;
      expect(a).toMatchObject({ x: 4, y: 0 });
      const b = r.cards.find((x) => x.id === "b")!;
      const c2 = r.cards.find((x) => x.id === "c")!;
      const noOverlap = (p: typeof a, q: typeof a) =>
        !(p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h);
      expect(noOverlap(a, b)).toBe(true);
      expect(noOverlap(a, c2)).toBe(true);
      expect(noOverlap(b, c2)).toBe(true);
    }
  });
});
