"use client";

import type { TileAdapter } from "@/tiles/types";
import type { TaskDueData } from "@/tiles/task-due/types";
import type { TrelloConfig } from "../manifest";
import { useTrelloCards } from "../hooks/use-cards";
import { useTrelloConfigNameSync } from "../hooks/use-config-name-sync";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function boardHref(boardId?: string): string | undefined {
  return boardId ? `https://trello.com/b/${boardId}` : undefined;
}

export const taskDueAdapter: TileAdapter<TrelloConfig, TaskDueData> = {
  useData(card) {
    useTrelloConfigNameSync(card);
    const { boardId } = card.config;
    const dueWithinDays = card.config.dueWithinDays ?? 7;
    const enabled = Boolean(boardId);
    const { data, isLoading, error } = useTrelloCards(
      { boardId, dueWithinDays },
      enabled,
    );
    if (!data) return { data: undefined, isLoading, error };
    return {
      data: data.map((c) => ({
        id: c.id,
        title: c.name,
        due: c.due ?? undefined,
        groupTitle: c.listName,
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
  topbarLabel: (card) => {
    const days = clamp(card.config.dueWithinDays ?? 7, 1, 60);
    const board = card.config.boardName?.toUpperCase();
    return board ? `${board} — DUE ${days}D` : `DUE ${days}D`;
  },
  topbarHref: (card) => boardHref(card.config.boardId),
};
