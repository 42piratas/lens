"use client";

import { useMemo } from "react";
import type { LayoutCard } from "@/connectors/types";
import type { TrelloConfig } from "@/connectors/trello/manifest";
import { useTrelloLists } from "@/connectors/trello/hooks/use-lists";
import { useTrelloCards } from "@/connectors/trello/hooks/use-cards";
import { useTrelloConfigNameSync } from "@/connectors/trello/hooks/use-config-name-sync";
import {
  TrelloSkeleton,
  TrelloErrorPill,
  TrelloUnconfigured,
} from "@/connectors/trello/_shared/states";
import { TrelloCardItem } from "@/connectors/trello/_shared/card-item";
import { PluginRowDropTarget } from "@/components/grid/PluginRowDropTarget";

export function TrelloBoardTile({ card }: { card: LayoutCard<TrelloConfig> }) {
  useTrelloConfigNameSync(card);
  const { boardId, listIds } = card.config;
  const { data: lists, isLoading: listsLoading, error: listsError } = useTrelloLists(
    boardId,
    Boolean(boardId),
  );
  const { data: cards, isLoading: cardsLoading, error: cardsError } = useTrelloCards(
    { boardId, listIds: listIds && listIds.length ? listIds : undefined },
    Boolean(boardId),
  );

  const visibleLists = useMemo(() => {
    if (!lists) return [];
    const filtered = lists.filter((l) => !l.closed);
    if (!listIds || listIds.length === 0) return filtered;
    const allowed = new Set(listIds);
    return filtered.filter((l) => allowed.has(l.id));
  }, [lists, listIds]);

  const cardsByList = useMemo(() => {
    const map = new Map<string, typeof cards>();
    for (const c of cards ?? []) {
      const existing = map.get(c.listId) ?? [];
      existing.push(c);
      map.set(c.listId, existing);
    }
    return map;
  }, [cards]);

  if (!boardId) return <TrelloUnconfigured hint="Pick a board — gear icon" />;
  if (listsLoading || cardsLoading) return <TrelloSkeleton />;
  if (listsError || cardsError) return <TrelloErrorPill error={listsError ?? cardsError} />;
  if (visibleLists.length === 0) {
    return <TrelloUnconfigured hint="No open lists on this board" />;
  }

  return (
    <div className="lens-trello-board">
      {visibleLists.map((l) => {
        const items = cardsByList.get(l.id) ?? [];
        return (
          <section key={l.id} className="lens-trello-board-col">
            <header className="lens-trello-board-colhead">
              <span className="tile-label lens-trello-board-colname">{l.name}</span>
              <span className="meta-mono lens-trello-board-count">{items.length}</span>
            </header>
            <div className="lens-trello-board-collist">
              {items.length === 0 ? (
                <span className="meta-mono lens-trello-board-empty">Empty</span>
              ) : (
                items.map((c) => (
                  <PluginRowDropTarget key={c.id} card={card} targetId={c.id}>
                    <TrelloCardItem card={c} showList={false} />
                  </PluginRowDropTarget>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
