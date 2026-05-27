import type { TileManifest } from "../types";
import { getTileAdapter } from "..";
import { NoteCardsTile } from "./component";

export const manifest: TileManifest = {
  id: "note-cards",
  label: "Notes",
  recommendedSize: { w: 2, h: 3 },
  defaultSize: { w: 3, h: 8 },
  Component: NoteCardsTile,
  topbarLabel: (card) => getTileAdapter(card)?.topbarLabel?.(card),
  topbarHref: (card) => getTileAdapter(card)?.topbarHref?.(card),
};
