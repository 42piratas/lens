"use client";

import { type CSSProperties, type MouseEventHandler, type ReactNode } from "react";
import type { LayoutCard } from "@/connectors/types";
import {
  getPayloadAdapter,
  parseDragPayload,
} from "@/lib/dnd-payloads";
import { useDragContext } from "@/lib/dnd-payloads/drag-context";
import { enqueueWrite } from "@/lib/dnd-payloads/pending-writes";

/**
 * Wraps a single row inside a tile (Trello card row, Calendar event, etc.)
 * and turns it into a drop target for the in-flight payload. Renders a
 * pass-through fragment when nothing is being dragged or when the host
 * tile's adapter doesn't accept this payload kind / this target id.
 *
 * The "currently over" state lives in `useDragContext.overTarget` (global)
 * so only one target can ever be highlighted at a time — solves the classic
 * HTML5 dragleave/dragenter race between flex-row siblings (Trello columns,
 * Calendar all-day chips) where dragleave on A fires AFTER dragenter on B.
 */
export function PluginRowDropTarget({
  card,
  targetId,
  targetMeta,
  className,
  style,
  title,
  onClick,
  dataAttrs,
  children,
}: {
  card: LayoutCard;
  targetId: string;
  targetMeta?: Record<string, string>;
  className?: string;
  style?: CSSProperties;
  title?: string;
  /** Click handler — composes with drop. Used by b02-06 click-to-bind. */
  onClick?: MouseEventHandler<HTMLDivElement>;
  /** Pass-through `data-*` attributes (e.g. `data-clipped`). */
  dataAttrs?: Record<string, string | undefined>;
  children: ReactNode;
}) {
  const draggedKind = useDragContext((s) => s.kind);
  const draggedPayload = useDragContext((s) => s.payload);
  const overTarget = useDragContext((s) => s.overTarget);

  const adapter = draggedKind ? getPayloadAdapter(card, draggedKind) : undefined;
  const accepts = Boolean(
    adapter &&
      draggedPayload &&
      adapter.canAccept(card, draggedPayload) &&
      (adapter.canAcceptTarget?.(card, draggedPayload, { id: targetId, meta: targetMeta }) ?? true),
  );

  if (!accepts) {
    return (
      <div
        className={className}
        style={style}
        title={title}
        onClick={onClick}
        {...dataAttrs}
      >
        {children}
      </div>
    );
  }

  const isOver =
    overTarget?.cardId === card.id && overTarget.targetId === targetId;

  return (
    <div
      className={`lens-plugin-row-drop${className ? ` ${className}` : ""}`}
      style={style}
      title={title}
      onClick={onClick}
      {...dataAttrs}
      data-over={isOver ? "true" : undefined}
      // No `dataTransfer.types.includes(PAYLOAD_MIME)` gate here — some
      // Chromium variants / extensions strip custom MIMEs from `types` during
      // dragenter/dragover (only exposing them at `drop`). The wrapper is
      // already gated by `accepts === true` (zustand drag-context), so a
      // payload is in flight whenever these listeners exist. `parseDragPayload`
      // in `onDrop` is the reliable read.
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        useDragContext.getState().setOverTarget({ cardId: card.id, targetId });
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "copy";
        const cur = useDragContext.getState().overTarget;
        if (!cur || cur.cardId !== card.id || cur.targetId !== targetId) {
          useDragContext.getState().setOverTarget({ cardId: card.id, targetId });
        }
      }}
      onDragLeave={() => {
        useDragContext.getState().clearOverTarget({ cardId: card.id, targetId });
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        useDragContext.getState().clearOverTarget({ cardId: card.id, targetId });
        const payload = parseDragPayload(e.dataTransfer);
        if (!payload) return;
        enqueueWrite({
          kind: "accept",
          cardId: card.id,
          payload,
          target: { id: targetId, meta: targetMeta },
        });
      }}
    >
      {children}
    </div>
  );
}
