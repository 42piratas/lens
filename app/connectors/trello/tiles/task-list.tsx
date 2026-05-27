"use client";

import type { TileAdapter } from "@/tiles/types";
import type { TaskListData } from "@/tiles/task-list/types";
import type { TrelloConfig } from "../manifest";
import { useTrelloCards } from "../hooks/use-cards";
import { useTrelloConfigNameSync } from "../hooks/use-config-name-sync";

function boardHref(boardId?: string): string | undefined {
  return boardId ? `https://trello.com/b/${boardId}` : undefined;
}

export const taskListAdapter: TileAdapter<TrelloConfig, TaskListData> = {
  useData(card) {
    useTrelloConfigNameSync(card);
    const { boardId, listId } = card.config;
    const enabled = Boolean(boardId && listId);
    const { data, isLoading, error } = useTrelloCards(
      { boardId, listIds: listId ? [listId] : undefined },
      enabled,
    );
    if (!data) return { data: undefined, isLoading, error };
    return {
      data: data.map((c) => ({
        id: c.id,
        title: c.name,
        due: c.due ?? undefined,
        labels: c.labels.map((l) => ({ name: l.name, color: l.color ?? undefined })),
        badges: {
          checklists: c.badges.checklistsTotal
            ? { done: c.badges.checklistsDone, total: c.badges.checklistsTotal }
            : undefined,
          attachments: c.badges.attachments || undefined,
          comments: c.badges.comments || undefined,
        },
        body: c.desc,
        parentTitle: c.listName,
      })),
      isLoading,
      error,
    };
  },
  topbarLabel: (card) =>
    card.config.listName?.toUpperCase() ??
    card.config.boardName?.toUpperCase() ??
    undefined,
  topbarHref: (card) => boardHref(card.config.boardId),
};
