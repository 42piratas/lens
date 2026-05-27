"use client";

import { CheckSquare, MessageSquare, Paperclip, Square } from "lucide-react";
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
import type { TaskItem, TaskListData } from "./types";

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

export function TaskListTile({ card }: { card: LayoutCard }) {
  const adapter = getTileAdapter(card);
  if (!adapter) return null;
  const { data, isLoading, error } = adapter.useData(card) as {
    data: TaskListData | undefined;
    isLoading: boolean;
    error: unknown;
  };

  if (isLoading) return <TileSkeleton />;
  if (error) return <TileErrorPill error={error} />;
  if (!data) return <TileUnconfigured hint="Set up — gear icon" />;
  if (data.length === 0) return <TileEmpty hint="No items" />;

  return (
    <div className="lens-card-surface">
      <div className="lens-tasks-list">
        {data.map((item) => (
          <PluginRowDropTarget key={item.id} card={card} targetId={item.id}>
            <TaskRow item={item} connectorId={card.connector} />
          </PluginRowDropTarget>
        ))}
      </div>
    </div>
  );
}

function TaskRow({
  item,
  connectorId,
}: {
  item: TaskItem;
  connectorId: string;
}) {
  const { isClipped, toggleClip } = useClips();
  const clipped = isClipped(connectorId, item.id);
  const onClip = () =>
    toggleClip({
      kind: "clip-like",
      label: item.title || "(untitled)",
      source: { connector: connectorId, sourceId: item.id },
      parentTitle: item.parentTitle,
      originalContent: item.body ?? "",
    });
  const hasCheckbox = item.done !== undefined;
  const past = item.due ? isPastDue(item.due) : false;
  const hasBadges =
    !!item.badges?.checklists?.total ||
    !!item.badges?.attachments ||
    !!item.badges?.comments;
  const hasLabels = !!item.labels && item.labels.length > 0;
  // Trello cards (no `done` field) always render as cards — even when they
  // have no labels or badges. Google Tasks items (with `done`) render as
  // checkbox rows.
  const isCard = !hasCheckbox;

  if (isCard) {
    return (
      <button
        type="button"
        className="lens-trello-card"
        title={item.title}
        data-clipped={clipped ? "true" : undefined}
        onClick={onClip}
      >
        <span className="lens-trello-card-title">{item.title}</span>
        {hasLabels && (
          <div className="lens-trello-labels">
            {item.labels!.map((l, i) => (
              <span
                key={`${l.name}-${l.color ?? ""}-${i}`}
                className={`lens-trello-label lens-trello-label--${l.color ?? "gray"}`}
                title={l.name || (l.color ?? "label")}
              >
                {l.name || " "}
              </span>
            ))}
          </div>
        )}
        {(item.due || hasBadges) && (
          <div className="lens-trello-card-footer">
            {item.due && (
              <span
                className="meta-mono lens-trello-due"
                data-past={past ? "true" : undefined}
              >
                {formatDueShort(item.due)}
              </span>
            )}
            {item.due && hasBadges && <span className="lens-trello-card-spacer" />}
            {item.badges?.checklists?.total ? (
              <span className="meta-mono lens-trello-badge" title="Checklist">
                <CheckSquare size={12} strokeWidth={1.75} aria-hidden />
                {item.badges.checklists.done}/{item.badges.checklists.total}
              </span>
            ) : null}
            {item.badges?.attachments ? (
              <span className="meta-mono lens-trello-badge" title="Attachments">
                <Paperclip size={12} strokeWidth={1.75} aria-hidden />
                {item.badges.attachments}
              </span>
            ) : null}
            {item.badges?.comments ? (
              <span className="meta-mono lens-trello-badge" title="Comments">
                <MessageSquare size={12} strokeWidth={1.75} aria-hidden />
                {item.badges.comments}
              </span>
            ) : null}
          </div>
        )}
      </button>
    );
  }

  return (
    <div
      className="lens-tasks-item"
      data-completed={item.done ? "true" : undefined}
      data-clipped={clipped ? "true" : undefined}
    >
      {hasCheckbox && (
        <span className="lens-tasks-checkbox" aria-hidden>
          {item.done ? (
            <CheckSquare size={14} strokeWidth={1.75} />
          ) : (
            <Square size={14} strokeWidth={1.75} />
          )}
        </span>
      )}
      <button
        type="button"
        className="lens-tasks-item-title lens-clip-target"
        onClick={onClip}
      >
        {item.title || "(untitled)"}
      </button>
      {item.due && (
        <span
          className="meta-mono lens-tasks-due"
          data-past={past && !item.done ? "true" : undefined}
        >
          {formatDueShort(item.due)}
        </span>
      )}
    </div>
  );
}
