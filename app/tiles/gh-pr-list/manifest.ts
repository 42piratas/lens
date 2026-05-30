import type { TileManifest } from "../types";
import type { GithubConfig } from "@/connectors/github/manifest";
import { GithubPrListTile } from "./component";

export const manifest: TileManifest<GithubConfig> = {
  id: "gh-pr-list",
  label: "Pull requests",
  recommendedSize: { w: 3, h: 5 },
  defaultSize: { w: 4, h: 6 },
  Component: GithubPrListTile,
  topbarLabel: (card) =>
    (card.config.prFilter ?? "involves-me").replace(/-/g, " ").toUpperCase(),
  topbarHref: (card) =>
    card.config.repo
      ? `https://github.com/${card.config.repo}/pulls`
      : "https://github.com/pulls",
};
