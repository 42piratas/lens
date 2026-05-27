"use client";

import { Square } from "lucide-react";
import type { LayoutCard } from "@/connectors/types";
import { PluginRowDropTarget } from "@/components/grid/PluginRowDropTarget";
import { getTileAdapter } from "..";
import {
  TileEmpty,
  TileErrorPill,
  TileSkeleton,
  TileUnconfigured,
} from "../_shared/states";
import { useClips } from "@/lib/dnd-payloads/use-clips";
import type { TaskDueData, TaskDueItem } from "./types";

function formatDueShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const sameYear = d.getFullYear() === today.getFullYear();
  const fmt: Intl.DateTimeFormatOptions = sameYear
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "2-digit" };
  return d.toLocaleDateString("en-US", fmt).toUpperCase();
}

function isPastDue(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

export function TaskDueTile({ card }: { card: LayoutCard }) {
  const adapter = getTileAdapter(card);
  if (!adapter) return null;
  const { data, isLoading, error } = adapter.useData(card) as {
    data: TaskDueData | undefined;
    isLoading: boolean;
    error: unknown;
  };

  if (isLoading) return <TileSkeleton />;
  if (error) return <TileErrorPill error={error} />;
  if (!data) return <TileUnconfigured hint="Set up — gear icon" />;
  if (data.length === 0) return <TileEmpty hint="Nothing due" />;

  return (
    <div className="lens-card-surface">
      <div className="lens-tasks-list">
        {data.map((item) => (
          <PluginRowDropTarget key={item.id} card={card} targetId={item.id}>
            <DueRow item={item} connectorId={card.connector} />
          </PluginRowDropTarget>
        ))}
      </div>
    </div>
  );
}

function DueRow({
  item,
  connectorId,
}: {
  item: TaskDueItem;
  connectorId: string;
}) {
  const { isClipped, toggleClip } = useClips();
  const clipped = isClipped(connectorId, item.id);
  const past = item.due ? isPastDue(item.due) : false;
  return (
    <div
      className="lens-tasks-item lens-tasks-item--stack"
      data-clipped={clipped ? "true" : undefined}
    >
      <div className="lens-tasks-item-row">
        <span className="lens-tasks-checkbox" aria-hidden>
          <Square size={14} strokeWidth={1.75} />
        </span>
        {item.due && (
          <span
            className="meta-mono lens-tasks-due"
            data-past={past ? "true" : undefined}
          >
            {formatDueShort(item.due)}
          </span>
        )}
        <button
          type="button"
          className="lens-tasks-item-title lens-clip-target"
          onClick={() =>
            toggleClip({
              kind: "clip-like",
              label: item.title || "(untitled)",
              source: { connector: connectorId, sourceId: item.id },
              parentTitle: item.parentTitle ?? item.groupTitle,
              originalContent: item.body ?? "",
            })
          }
        >
          {item.title || "(untitled)"}
        </button>
      </div>
      {item.groupTitle && (
        <span className="meta-mono lens-tasks-item-caption">
          {item.groupTitle}
        </span>
      )}
    </div>
  );
}
