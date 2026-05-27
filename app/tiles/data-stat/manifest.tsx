import type { TileManifest } from "../types";
import type { GoogleSheetsConfig } from "@/connectors/google-sheets/manifest";
import { makeSheetsTopbar } from "@/connectors/google-sheets/_shared/topbar";
import { GoogleSheetsCellTile } from "./component";

const CellTopbar = makeSheetsTopbar((card) => card.config.cell);

export const manifest: TileManifest<GoogleSheetsConfig> = {
  id: "data-stat",
  label: "Cell",
  recommendedSize: { w: 2, h: 2 },
  defaultSize: { w: 3, h: 2 },
  Component: GoogleSheetsCellTile,
  topbarLabel: (card) =>
    card.config.label?.toUpperCase() ?? card.config.cell?.toUpperCase() ?? "CELL",
  TopbarContent: CellTopbar,
};
