import type { TileManifest } from "../types";
import type { GoogleCalendarConfig } from "@/connectors/google-calendar/manifest";
import { GoogleCalendarWeekTile } from "./component";

export const manifest: TileManifest<GoogleCalendarConfig> = {
  id: "calendar-one-week",
  label: "Week",
  recommendedSize: { w: 4, h: 4 },
  defaultSize: { w: 7, h: 8 },
  Component: GoogleCalendarWeekTile,
  topbarHref: () => "https://calendar.google.com/",
};
