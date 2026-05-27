import type { LayoutCard } from "@/connectors/types";
import { GRID_DIM } from "@/lib/grid/geometry";

type Rect = { x: number; y: number; w: number; h: number };

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export type ReflowResult =
  | { ok: true; cards: LayoutCard[] }
  | { ok: false };

/**
 * Move card `movedId` to (newX,newY). Displace cards that overlap the new
 * position into a truly empty slot — no cascading: a displaced card cannot
 * bump another peaceful card. If no empty slot exists for any displaced
 * card, the move is rejected.
 */
export function reflowAfterMove(
  cards: LayoutCard[],
  movedId: string,
  newX: number,
  newY: number,
): ReflowResult {
  const moved = cards.find((c) => c.id === movedId);
  if (!moved) return { ok: false };
  if (newX + moved.w > GRID_DIM || newY + moved.h > GRID_DIM) return { ok: false };
  if (newX < 0 || newY < 0) return { ok: false };

  const next: Record<string, LayoutCard> = {};
  for (const c of cards) next[c.id] = { ...c };
  next[movedId] = { ...moved, x: newX, y: newY };

  const displaced: string[] = [];
  for (const c of Object.values(next)) {
    if (c.id === movedId) continue;
    if (overlaps(c, next[movedId])) displaced.push(c.id);
  }

  for (const id of displaced) {
    const card = next[id];
    const blockers = Object.values(next).filter((c) => c.id !== id);
    let placed: { x: number; y: number } | null = null;
    outer: for (let y = 0; y <= GRID_DIM - card.h; y++) {
      for (let x = 0; x <= GRID_DIM - card.w; x++) {
        const candidate = { x, y, w: card.w, h: card.h };
        const conflict = blockers.some((b) => overlaps(candidate, b));
        if (!conflict) {
          placed = { x, y };
          break outer;
        }
      }
    }
    if (!placed) return { ok: false };
    next[id] = { ...card, x: placed.x, y: placed.y };
  }

  return { ok: true, cards: cards.map((c) => next[c.id]) };
}
