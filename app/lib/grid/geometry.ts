export const GRID_DIM = 20;
export const MIN_VW = 1280;
export const MAX_VW = 1920;

export type GridCell = { row: number; col: number };

export function pointerToCell(
  surfaceRect: DOMRect,
  clientX: number,
  clientY: number,
): GridCell | null {
  const x = clientX - surfaceRect.left;
  const y = clientY - surfaceRect.top;
  if (x < 0 || y < 0 || x > surfaceRect.width || y > surfaceRect.height) return null;
  const col = Math.min(GRID_DIM - 1, Math.max(0, Math.floor((x / surfaceRect.width) * GRID_DIM)));
  const row = Math.min(GRID_DIM - 1, Math.max(0, Math.floor((y / surfaceRect.height) * GRID_DIM)));
  return { row, col };
}

export function clampSize(
  origin: GridCell,
  size: { w: number; h: number },
): { w: number; h: number } {
  const w = Math.min(size.w, GRID_DIM - origin.col);
  const h = Math.min(size.h, GRID_DIM - origin.row);
  return { w: Math.max(1, w), h: Math.max(1, h) };
}
