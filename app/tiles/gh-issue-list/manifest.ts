import type { TileManifest } from "../types";
import type { GithubConfig } from "@/connectors/github/manifest";
import { GithubIssueListTile } from "./component";

export const manifest: TileManifest<GithubConfig> = {
  id: "gh-issue-list",
  label: "Issues",
  recommendedSize: { w: 3, h: 6 },
  defaultSize: { w: 4, h: 8 },
  Component: GithubIssueListTile,
  topbarLabel: (card) =>
    (card.config.repo ?? card.config.org ?? "ISSUES").toUpperCase(),
  topbarHref: (card) =>
    card.config.repo
      ? `https://github.com/${card.config.repo}/issues`
      : card.config.org
        ? `https://github.com/orgs/${card.config.org}/issues`
        : undefined,
};
