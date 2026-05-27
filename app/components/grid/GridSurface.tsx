"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useLayoutStore } from "@/lib/layout/store";
import { useGridStore } from "@/lib/grid/store";
import { usePanelStore } from "@/lib/panel/store";
import { useScratchpad } from "@/lib/hooks/use-scratchpad";
import { reflowAfterMove } from "@/lib/layout/reflow";
import { GRID_DIM, MIN_VW, MAX_VW } from "@/lib/grid/geometry";
import { CardChrome } from "./CardChrome";
import { GhostPreview } from "./GhostPreview";

export function GridSurface() {
  const cards = useLayoutStore((s) => s.cards);
  const hydrated = useLayoutStore((s) => s.hydrated);
  const hydrate = useLayoutStore((s) => s.hydrate);
  const replaceCards = useLayoutStore((s) => s.replaceCards);

  const gridVisible = useGridStore((s) => s.gridVisible);
  const manualOverride = useGridStore((s) => s.manualOverride);
  const applyAuto = useGridStore((s) => s.applyAuto);
  const setGridVisible = useGridStore((s) => s.setGridVisible);

  const panelMode = usePanelStore((s) => s.mode);
  const openPanel = usePanelStore((s) => s.open);

  // Scratchpad outside-click → clear binding. Mounted as a document-level
  // listener (only active while a binding exists) so it covers the canvas,
  // the page margins outside the grid, the sidebar, and any non-producer
  // tile. Clip-producer tiles + the note-buffer editor are protected so
  // clicking a producer row keeps its toggle semantics and clicking inside
  // the editor doesn't drop the binding mid-edit.
  // Keep CLIP_AWARE_TILES in sync when new clip-producer tiles ship.
  const { state: scratchpadState, clearBinding } = useScratchpad();
  useEffect(() => {
    if (!scratchpadState.binding) return;
    const CLIP_AWARE_TILES = new Set([
      "kanban-board",
      "task-list",
      "task-due",
      "calendar-one-day",
      "calendar-one-week",
      "calendar-many-weeks",
      "data-table",
      "note-buffer",
    ]);
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      const chrome = target.closest(".lens-card-chrome[data-tile]");
      const tileId = chrome?.getAttribute("data-tile");
      if (tileId && CLIP_AWARE_TILES.has(tileId)) return;
      clearBinding();
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [scratchpadState.binding, clearBinding]);

  const [vw, setVw] = useState<number | null>(null);
  const [dragGhost, setDragGhost] = useState<
    { x: number; y: number; w: number; h: number } | null
  >(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  const computeDropTarget = (
    activeId: string,
    delta: { x: number; y: number },
  ): { x: number; y: number; w: number; h: number } | null => {
    const surface = surfaceRef.current;
    if (!surface) return null;
    const rect = surface.getBoundingClientRect();
    const cs = window.getComputedStyle(surface);
    const gapX = parseFloat(cs.columnGap) || 0;
    const gapY = parseFloat(cs.rowGap) || 0;
    const strideX = (rect.width + gapX) / GRID_DIM;
    const strideY = (rect.height + gapY) / GRID_DIM;
    const card = cards.find((c) => c.id === activeId);
    if (!card) return null;
    const dx = Math.round(delta.x / strideX);
    const dy = Math.round(delta.y / strideY);
    const x = Math.max(0, Math.min(GRID_DIM - card.w, card.x + dx));
    const y = Math.max(0, Math.min(GRID_DIM - card.h, card.y + dy));
    return { x, y, w: card.w, h: card.h };
  };

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const update = () => setVw(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (manualOverride) return;
    applyAuto(cards.length === 0);
  }, [cards.length, manualOverride, applyAuto]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const onDragStart = (event: DragStartEvent) => {
    const target = computeDropTarget(String(event.active.id), { x: 0, y: 0 });
    setDragGhost(target);
  };

  const onDragMove = (event: DragMoveEvent) => {
    const target = computeDropTarget(String(event.active.id), event.delta);
    setDragGhost(target);
  };

  const onDragCancel = () => setDragGhost(null);

  const onDragEnd = (event: DragEndEvent) => {
    setDragGhost(null);
    const id = String(event.active.id);
    const target = computeDropTarget(id, event.delta);
    const card = cards.find((c) => c.id === id);
    if (!target || !card) return;
    if (target.x === card.x && target.y === card.y) return;
    const result = reflowAfterMove(cards, id, target.x, target.y);
    if (result.ok) replaceCards(result.cards);
  };

  if (vw !== null && vw < MIN_VW) return <TooSmallNotice />;

  const empty = !hydrated || cards.length === 0;
  const letterboxed = vw !== null && vw > MAX_VW;
  const showCenterPlus = empty && panelMode === "closed";

  const onCenterPlus = () => {
    setGridVisible(true);
    openPanel();
  };

  return (
    <div
      className="grid-surface-wrapper"
      data-letterbox={letterboxed ? "true" : undefined}
    >
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragCancel={onDragCancel}
        onDragEnd={onDragEnd}
      >
        <div
          ref={surfaceRef}
          className="grid-surface"
          data-grid-visible={gridVisible ? "true" : "false"}
        >
          {cards.map((card) => (
            <CardChrome key={card.id} card={card} />
          ))}
          <GhostPreview />
          {dragGhost && (
            <div
              className="grid-ghost-preview"
              aria-hidden
              style={{
                gridColumn: `${dragGhost.x + 1} / span ${dragGhost.w}`,
                gridRow: `${dragGhost.y + 1} / span ${dragGhost.h}`,
              }}
            />
          )}
          {showCenterPlus && (
            <button
              type="button"
              onClick={onCenterPlus}
              aria-label="Add a card"
              title="Add a card"
              className="tile empty-grid-affordance"
            >
              <Plus size={32} strokeWidth={1.5} aria-hidden />
              <span className="meta-mono">Add a card</span>
            </button>
          )}
        </div>
      </DndContext>
    </div>
  );
}

function TooSmallNotice() {
  return (
    <div className="grid-surface-toosmall">
      <p className="meta-mono">LENS needs at least 1280×800.</p>
      <p className="card-text">Resize the window or open on a larger display.</p>
    </div>
  );
}
