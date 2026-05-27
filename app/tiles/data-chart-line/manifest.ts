import type { TileManifest } from "../types";
import { getTileAdapter } from "..";
import { DataChartLineTile } from "./component";

export const manifest: TileManifest = {
  id: "data-chart-line",
  label: "Line chart",
  recommendedSize: { w: 4, h: 4 },
  defaultSize: { w: 6, h: 5 },
  Component: DataChartLineTile,
  topbarLabel: (card) => getTileAdapter(card)?.topbarLabel?.(card),
  topbarHref: (card) => getTileAdapter(card)?.topbarHref?.(card),
};
