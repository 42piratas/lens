"use client";

import { useState } from "react";
import type { LayoutCard } from "@/connectors/types";
import { emitPayload } from "@/lib/dnd-payloads";
import { useDragContext } from "@/lib/dnd-payloads/drag-context";
import { getTileAdapter } from "..";
import {
  TileEmpty,
  TileErrorPill,
  TileSkeleton,
  TileUnconfigured,
} from "../_shared/states";
import type { BadgesWithDescriptionsData } from "./types";

// Trello's fixed label palette. Stable hash → palette index gives every badge
// name a consistent color across drops without requiring user configuration.
const PALETTE = [
  "green",
  "yellow",
  "orange",
  "red",
  "purple",
  "blue",
  "sky",
  "lime",
  "pink",
  "black",
] as const;

function colorForName(name: string): string {
  let h = 5381;
  for (let i = 0; i < name.length; i++) h = ((h << 5) + h + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function BadgesWithDescriptionsTile({ card }: { card: LayoutCard }) {
  const adapter = getTileAdapter(card);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  if (!adapter) return null;
  const { data, isLoading, error } = adapter.useData(card) as {
    data: BadgesWithDescriptionsData | undefined;
    isLoading: boolean;
    error: unknown;
  };

  if (isLoading) return <TileSkeleton />;
  if (error) return <TileErrorPill error={error} />;
  if (!data) return <TileUnconfigured hint="Set up — gear icon" />;
  if (data.length === 0) return <TileEmpty hint="No items" />;

  return (
    <div className="lens-card-surface lens-badges-list">
      <ul className="lens-badges-rows">
        {data.map((item) => (
          <li
            key={item.id}
            className="lens-badges-row"
            draggable
            data-payload-kind="tag-like"
            data-dragging={draggingId === item.id ? "true" : undefined}
            onDragStart={(e) => {
              const payload = {
                kind: "tag-like" as const,
                name: item.name,
                description: item.description || undefined,
                color: colorForName(item.name),
                source: { connector: card.connector, sourceId: item.id },
              };
              emitPayload(e.dataTransfer, payload);
              useDragContext.getState().beginDrag(payload);
              setDraggingId(item.id);
              // Drag image: just the chip, not the whole row.
              const chip = e.currentTarget.querySelector(".lens-badge-chip");
              if (chip instanceof HTMLElement) {
                const rect = chip.getBoundingClientRect();
                e.dataTransfer.setDragImage(chip, rect.width / 2, rect.height / 2);
              }
            }}
            onDragEnd={() => {
              useDragContext.getState().endDrag();
              setDraggingId(null);
            }}
          >
            <span className="lens-badge-chip" title={item.name}>
              {item.name}
            </span>
            <span className="lens-badge-desc card-text">{item.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
