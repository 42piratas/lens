// AUTO-GENERATED — do not edit. Run `pnpm gen:registries` to regenerate.
//
// Source of truth: each `app/tiles/<id>/manifest.ts`.
// To add a tile: copy `_template/`, edit the manifest, run `pnpm gen:registries`.
//
import type { LayoutCard } from "@/connectors/types";
import { getConnector } from "@/connectors";
import type { TileAdapter, TileManifest } from "./types";
import { manifest as badgesWithDescriptionsManifest } from "./badges-with-descriptions/manifest";
import { manifest as calendarManyWeeksManifest } from "./calendar-many-weeks/manifest";
import { manifest as calendarOneDayManifest } from "./calendar-one-day/manifest";
import { manifest as calendarOneMonthManifest } from "./calendar-one-month/manifest";
import { manifest as calendarOneWeekManifest } from "./calendar-one-week/manifest";
import { manifest as dataChartLineManifest } from "./data-chart-line/manifest";
import { manifest as dataStatManifest } from "./data-stat/manifest";
import { manifest as dataTableManifest } from "./data-table/manifest";
import { manifest as ghIssueListManifest } from "./gh-issue-list/manifest";
import { manifest as ghNotificationListManifest } from "./gh-notification-list/manifest";
import { manifest as ghPrListManifest } from "./gh-pr-list/manifest";
import { manifest as kanbanBoardManifest } from "./kanban-board/manifest";
import { manifest as mediaListManifest } from "./media-list/manifest";
import { manifest as noteBufferManifest } from "./note-buffer/manifest";
import { manifest as noteCardsManifest } from "./note-cards/manifest";
import { manifest as taskDueManifest } from "./task-due/manifest";
import { manifest as taskListManifest } from "./task-list/manifest";

const manifests: TileManifest<unknown>[] = [
  badgesWithDescriptionsManifest as TileManifest<unknown>,
  calendarManyWeeksManifest as TileManifest<unknown>,
  calendarOneDayManifest as TileManifest<unknown>,
  calendarOneMonthManifest as TileManifest<unknown>,
  calendarOneWeekManifest as TileManifest<unknown>,
  dataChartLineManifest as TileManifest<unknown>,
  dataStatManifest as TileManifest<unknown>,
  dataTableManifest as TileManifest<unknown>,
  ghIssueListManifest as TileManifest<unknown>,
  ghNotificationListManifest as TileManifest<unknown>,
  ghPrListManifest as TileManifest<unknown>,
  kanbanBoardManifest as TileManifest<unknown>,
  mediaListManifest as TileManifest<unknown>,
  noteBufferManifest as TileManifest<unknown>,
  noteCardsManifest as TileManifest<unknown>,
  taskDueManifest as TileManifest<unknown>,
  taskListManifest as TileManifest<unknown>,
];

const byId = new Map<string, TileManifest<unknown>>(
  manifests.map((m) => [m.id, m] as const),
);

export function getTiles(): TileManifest<unknown>[] {
  return manifests;
}

export function getTile(id: string): TileManifest<unknown> | undefined {
  return byId.get(id);
}

export function getTilesForConnector(
  compatibleTileIds: readonly string[],
): TileManifest<unknown>[] {
  return compatibleTileIds
    .map((id) => byId.get(id))
    .filter((m): m is TileManifest<unknown> => Boolean(m));
}

/**
 * Returns the connector's adapter for the card's tile, if any. Shared tiles
 * (media-list, task-list, task-due, note-cards) dispatch render-side data
 * fetches through this lookup.
 */
export function getTileAdapter(
  card: LayoutCard,
): TileAdapter<unknown> | undefined {
  return getConnector(card.connector)?.tileAdapters?.[card.tile] as
    | TileAdapter<unknown>
    | undefined;
}

export type { TileAdapter, TileManifest } from "./types";
