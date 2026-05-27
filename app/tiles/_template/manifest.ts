import type { TileManifest } from "../types";
import { ExampleTile } from "./component";

type Config = { example?: string };

export const manifest: TileManifest<Config> = {
  id: "example",
  label: "Example",
  defaultSize: { w: 4, h: 4 },
  Component: ExampleTile,
};
