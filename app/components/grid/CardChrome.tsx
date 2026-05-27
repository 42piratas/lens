"use client";

import { useSyncExternalStore } from "react";
import { Settings } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { LayoutCard } from "@/connectors/types";
import { getConnector } from "@/connectors";
import { getTile } from "@/tiles";
import { usePanelStore } from "@/lib/panel/store";
import {
  getFailureForCard,
  retryFailureForCard,
  subscribeToFailures,
} from "@/lib/dnd-payloads/pending-writes";

function useCardFailure(cardId: string) {
  return useSyncExternalStore(
    subscribeToFailures,
    () => getFailureForCard(cardId),
    () => undefined,
  );
}

export function CardChrome({ card }: { card: LayoutCard }) {
  const openEdit = usePanelStore((s) => s.openEdit);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
  });
  const failure = useCardFailure(card.id);

  const manifest = getConnector(card.connector);
  const tile = getTile(card.tile);
  if (!manifest || !tile) return null;
  const Component = tile.Component;
  const TopbarContent = tile.TopbarContent;
  const fallbackLabel = `${manifest.name} · ${tile.label}`;
  const label = tile.topbarLabel?.(card) ?? fallbackLabel;
  const href = tile.topbarHref?.(card);

  const onGear = () => {
    openEdit(card.id, {
      connector: card.connector,
      tile: card.tile,
      w: card.w,
      h: card.h,
      config: card.config,
    });
  };

  return (
    <div
      ref={setNodeRef}
      className="lens-card-chrome"
      data-card-id={card.id}
      data-tile={card.tile}
      data-dragging={isDragging ? "true" : undefined}
      style={{
        gridColumn: `${card.x + 1} / span ${card.w}`,
        gridRow: `${card.y + 1} / span ${card.h}`,
        transform: CSS.Translate.toString(transform),
      }}
    >
      <div
        className="lens-card-topbar"
        data-custom-content={TopbarContent ? "true" : undefined}
        {...listeners}
        {...attributes}
        aria-label={`Drag ${fallbackLabel}`}
        title={fallbackLabel}
      >
        {TopbarContent ? (
          <TopbarContent card={card as never} />
        ) : (
          <span className="lens-card-topbar-label-wrap">
            {href ? (
              <a
                className="lens-card-topbar-label"
                data-link="true"
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                title={label}
              >
                {label}
              </a>
            ) : (
              <span className="lens-card-topbar-label" title={label}>
                {label}
              </span>
            )}
          </span>
        )}
        <button
          type="button"
          className="lens-card-gear"
          onClick={onGear}
          aria-label={`Edit ${fallbackLabel}`}
          title="Edit card"
        >
          <Settings size={14} strokeWidth={1.75} aria-hidden />
        </button>
      </div>
      <div className="lens-card-body">
        <Component card={card} />
        {failure ? (
          <button
            type="button"
            className="lens-plugin-failure-pill"
            onClick={() => retryFailureForCard(card.id)}
            title={failure.reason}
          >
            <span>Write-back failed — retry</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
