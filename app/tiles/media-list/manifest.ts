import type { TileManifest } from "../types";
import { getTileAdapter } from "..";
import { MediaListTile } from "./component";

export const manifest: TileManifest = {
  id: "media-list",
  label: "List",
  recommendedSize: { w: 2, h: 4 },
  defaultSize: { w: 3, h: 8 },
  Component: MediaListTile,
  topbarLabel: (card) => getTileAdapter(card)?.topbarLabel?.(card),
  topbarHref: (card) => getTileAdapter(card)?.topbarHref?.(card),
};
