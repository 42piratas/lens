import type { TileManifest } from "../types";
import type { GoogleCalendarConfig } from "@/connectors/google-calendar/manifest";
import { GoogleCalendarMonthTile } from "./component";

export const manifest: TileManifest<GoogleCalendarConfig> = {
  id: "calendar-one-month",
  label: "Month",
  recommendedSize: { w: 6, h: 6 },
  defaultSize: { w: 8, h: 8 },
  Component: GoogleCalendarMonthTile,
  topbarHref: () => "https://calendar.google.com/",
};
