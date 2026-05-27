import type { ComponentType } from "react";
import type { LayoutCard } from "@/connectors/types";

export type TileManifest<TConfig = unknown> = {
  id: string;
  label: string;
  description?: string;
  recommendedSize?: { w: number; h: number };
  defaultSize: { w: number; h: number };
  Component: ComponentType<{ card: LayoutCard<TConfig> }>;
  topbarLabel?: (card: LayoutCard<TConfig>) => string | undefined;
  TopbarContent?: ComponentType<{ card: LayoutCard<TConfig> }>;
  topbarHref?: (card: LayoutCard<TConfig>) => string | undefined;
};

/**
 * A connector's contribution to a shared tile. The tile component dispatches
 * to `useData(card)` to get the normalized data shape for that tile.
 *
 * Shared tiles (e.g. media-list, task-list) define their own normalized data
 * type and live under `app/tiles/<tile-id>/types.ts`. Each connector that
 * lists a shared tile in `ConnectorManifest.tiles[]` MUST register a matching
 * adapter under `ConnectorManifest.tileAdapters[tileId]`.
 */
export type TileAdapter<TConfig = unknown, TData = unknown> = {
  useData: (card: LayoutCard<TConfig>) => {
    data: TData | undefined;
    isLoading: boolean;
    error: unknown;
  };
  topbarLabel?: (card: LayoutCard<TConfig>) => string | undefined;
  topbarHref?: (card: LayoutCard<TConfig>) => string | undefined;
};
