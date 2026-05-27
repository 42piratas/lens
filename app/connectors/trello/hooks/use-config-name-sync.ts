"use client";

import { useEffect } from "react";
import { useLayoutStore } from "@/lib/layout/store";
import type { LayoutCard } from "../../types";
import type { TrelloConfig } from "../manifest";
import { useTrelloBoards } from "./use-boards";
import { useTrelloLists } from "./use-lists";

export function useTrelloConfigNameSync(card: LayoutCard<TrelloConfig>) {
  const updateCard = useLayoutStore((s) => s.updateCard);
  const { boardId, listId, boardName, listName } = card.config;
  const { data: boards } = useTrelloBoards();
  const { data: lists } = useTrelloLists(boardId, Boolean(boardId));

  useEffect(() => {
    if (!boardId) return;
    const liveBoardName = boards?.find((b) => b.id === boardId)?.name;
    const liveListName = listId
      ? lists?.find((l) => l.id === listId)?.name
      : undefined;
    const updates: Partial<TrelloConfig> = {};
    if (liveBoardName && liveBoardName !== boardName) updates.boardName = liveBoardName;
    if (liveListName && liveListName !== listName) updates.listName = liveListName;
    if (Object.keys(updates).length === 0) return;
    updateCard(card.id, { config: { ...card.config, ...updates } });
  }, [boards, lists, boardId, listId, boardName, listName, card.id, card.config, updateCard]);
}
