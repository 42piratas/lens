"use client";

import { CheckSquare, MessageSquare, Paperclip } from "lucide-react";
import type { NormalizedTrelloCard } from "../types";
import { formatDueShort, isPastDue, labelClass } from "./utils";
import { useClips } from "@/lib/dnd-payloads/use-clips";

type Props = {
  card: NormalizedTrelloCard;
  showList?: boolean;
};

export function TrelloCardItem({ card, showList = false }: Props) {
  const past = isPastDue(card);
  const hasBadges =
    card.badges.checklistsTotal > 0 ||
    card.badges.attachments > 0 ||
    card.badges.comments > 0;
  const hasFooter = Boolean(card.due) || hasBadges;
  const { isClipped, toggleClip } = useClips();
  const clipped = isClipped("trello", card.id);
  return (
    <button
      type="button"
      className="lens-trello-card"
      title={card.name}
      data-clipped={clipped ? "true" : undefined}
      onClick={() =>
        toggleClip({
          kind: "clip-like",
          label: card.name,
          source: { connector: "trello", sourceId: card.id },
          parentTitle: card.listName,
          originalContent: card.desc,
          href: card.url,
        })
      }
    >
      {showList && card.listName && (
        <span className="meta-mono lens-trello-card-listname">{card.listName}</span>
      )}
      <span className="lens-trello-card-title">{card.name}</span>
      {card.labels.length > 0 && (
        <div className="lens-trello-labels">
          {card.labels.map((l, i) => (
            <span
              key={`${l.name}-${l.color}-${i}`}
              className={`lens-trello-label ${labelClass(l.color)}`}
              title={l.name || (l.color ?? "label")}
            >
              {l.name || " "}
            </span>
          ))}
        </div>
      )}
      {hasFooter && (
        <div className="lens-trello-card-footer">
          {card.due && (
            <span
              className="meta-mono lens-trello-due"
              data-past={past ? "true" : undefined}
            >
              {formatDueShort(card.due)}
            </span>
          )}
          {card.due && hasBadges && <span className="lens-trello-card-spacer" />}
          {card.badges.checklistsTotal > 0 && (
            <span className="meta-mono lens-trello-badge" title="Checklist">
              <CheckSquare size={12} strokeWidth={1.75} aria-hidden />
              {card.badges.checklistsDone}/{card.badges.checklistsTotal}
            </span>
          )}
          {card.badges.attachments > 0 && (
            <span className="meta-mono lens-trello-badge" title="Attachments">
              <Paperclip size={12} strokeWidth={1.75} aria-hidden />
              {card.badges.attachments}
            </span>
          )}
          {card.badges.comments > 0 && (
            <span className="meta-mono lens-trello-badge" title="Comments">
              <MessageSquare size={12} strokeWidth={1.75} aria-hidden />
              {card.badges.comments}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
