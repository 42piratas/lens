import type { TileManifest } from "../types";
import type { GithubConfig } from "@/connectors/github/manifest";
import { GithubNotificationListTile } from "./component";

export const manifest: TileManifest<GithubConfig> = {
  id: "gh-notification-list",
  label: "Notifications",
  recommendedSize: { w: 3, h: 6 },
  defaultSize: { w: 4, h: 8 },
  Component: GithubNotificationListTile,
  topbarLabel: (card) =>
    (card.config.notificationFilter ?? "all") === "all"
      ? "NOTIFICATIONS"
      : (card.config.notificationFilter ?? "all").replace(/-/g, " ").toUpperCase(),
  topbarHref: () => "https://github.com/notifications",
};
