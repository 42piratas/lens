import { GRID_DIM } from "@/lib/grid/geometry";
import type { LayoutCard } from "@/connectors/types";

export type Slot = { x: number; y: number };

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return (
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
  );
}

export function findFirstAvailableSlot(
  cards: LayoutCard[],
  w: number,
  h: number,
  excludeId?: string,
): Slot | null {
  if (w <= 0 || h <= 0 || w > GRID_DIM || h > GRID_DIM) return null;
  const blockers = excludeId ? cards.filter((c) => c.id !== excludeId) : cards;
  for (let y = 0; y <= GRID_DIM - h; y++) {
    for (let x = 0; x <= GRID_DIM - w; x++) {
      const candidate = { x, y, w, h };
      const conflict = blockers.some((c) =>
        rectsOverlap(candidate, { x: c.x, y: c.y, w: c.w, h: c.h }),
      );
      if (!conflict) return { x, y };
    }
  }
  return null;
}
