import type { TileManifest } from "../types";
import type { GoogleSheetsConfig } from "@/connectors/google-sheets/manifest";
import { makeSheetsTopbar } from "@/connectors/google-sheets/_shared/topbar";
import { GoogleSheetsRangeTile } from "./component";

const RangeTopbar = makeSheetsTopbar((card) => card.config.range);

export const manifest: TileManifest<GoogleSheetsConfig> = {
  id: "data-table",
  label: "Range",
  recommendedSize: { w: 3, h: 3 },
  defaultSize: { w: 6, h: 6 },
  Component: GoogleSheetsRangeTile,
  topbarLabel: (card) =>
    card.config.label?.toUpperCase() ?? card.config.range?.toUpperCase() ?? "RANGE",
  TopbarContent: RangeTopbar,
};
