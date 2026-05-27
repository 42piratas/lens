import type { TileManifest } from "../types";
import type { GoogleCalendarConfig } from "@/connectors/google-calendar/manifest";
import { GoogleCalendarTodayTile } from "./component";

const CALENDAR_HREF = "https://calendar.google.com/";

export const manifest: TileManifest<GoogleCalendarConfig> = {
  id: "calendar-one-day",
  label: "Today",
  recommendedSize: { w: 2, h: 3 },
  defaultSize: { w: 3, h: 6 },
  Component: GoogleCalendarTodayTile,
  topbarLabel: () => {
    const d = new Date();
    const dow = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    const mon = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    return `${dow} ${d.getDate()}, ${mon}`;
  },
  topbarHref: () => CALENDAR_HREF,
};
