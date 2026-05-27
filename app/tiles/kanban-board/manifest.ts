import type { TileManifest } from "../types";
import type { TrelloConfig } from "@/connectors/trello/manifest";
import { TrelloBoardTile } from "./component";

function boardHref(boardId?: string): string | undefined {
  return boardId ? `https://trello.com/b/${boardId}` : undefined;
}

export const manifest: TileManifest<TrelloConfig> = {
  id: "kanban-board",
  label: "Board",
  recommendedSize: { w: 8, h: 6 },
  defaultSize: { w: 12, h: 10 },
  Component: TrelloBoardTile,
  topbarLabel: (card) => card.config.boardName?.toUpperCase() ?? "BOARD",
  topbarHref: (card) => boardHref(card.config.boardId),
};
