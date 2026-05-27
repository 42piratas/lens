import type { TileManifest } from "../types";
import { getTileAdapter } from "..";
import { TaskDueTile } from "./component";

export const manifest: TileManifest = {
  id: "task-due",
  label: "Due",
  recommendedSize: { w: 2, h: 3 },
  defaultSize: { w: 3, h: 6 },
  Component: TaskDueTile,
  topbarLabel: (card) => getTileAdapter(card)?.topbarLabel?.(card),
  topbarHref: (card) => getTileAdapter(card)?.topbarHref?.(card),
};
