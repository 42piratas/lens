import type { TileManifest } from "../types";
import type { GoogleCalendarConfig } from "@/connectors/google-calendar/manifest";
import {
  GoogleCalendarMacroTile,
  GoogleCalendarMacroTopbar,
} from "./component";

export const manifest: TileManifest<GoogleCalendarConfig> = {
  id: "calendar-many-weeks",
  label: "Macro",
  recommendedSize: { w: 6, h: 3 },
  defaultSize: { w: 12, h: 4 },
  Component: GoogleCalendarMacroTile,
  TopbarContent: GoogleCalendarMacroTopbar,
};
