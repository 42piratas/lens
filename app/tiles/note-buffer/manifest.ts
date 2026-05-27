import type { TileManifest } from "../types";
import { NoteBufferTopbar, ScratchpadListTile } from "./component";

export const manifest: TileManifest = {
  id: "note-buffer",
  label: "Scratchpad",
  recommendedSize: { w: 3, h: 5 },
  defaultSize: { w: 3, h: 8 },
  Component: ScratchpadListTile,
  TopbarContent: NoteBufferTopbar,
};
