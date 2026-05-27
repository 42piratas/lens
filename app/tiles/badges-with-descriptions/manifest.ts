import type { TileManifest } from "../types";
import { getTileAdapter } from "..";
import { BadgesWithDescriptionsTile } from "./component";

export const manifest: TileManifest = {
  id: "badges-with-descriptions",
  label: "Badges + descriptions",
  recommendedSize: { w: 3, h: 4 },
  defaultSize: { w: 4, h: 6 },
  Component: BadgesWithDescriptionsTile,
  topbarLabel: (card) => getTileAdapter(card)?.topbarLabel?.(card),
  topbarHref: (card) => getTileAdapter(card)?.topbarHref?.(card),
};
