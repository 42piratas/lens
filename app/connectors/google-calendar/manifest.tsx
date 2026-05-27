import { Calendar } from "lucide-react";
import { z } from "zod";
import type { ConnectorManifest } from "../types";
import { ConfigBody } from "./config";
import { clipLikeAdapter } from "./payload-adapters/clip-like";
import { noteLikeAdapter } from "./payload-adapters/note-like";
import { tagLikeAdapter } from "./payload-adapters/tag-like";

const ConfigShape = z.object({
  calendarIds: z.array(z.string()).optional(),
  startOfWeek: z.enum(["mon", "sun"]).optional(),
  weeks: z.number().int().min(2).max(12).optional(),
});

export const ConfigSchema = z.preprocess((raw) => {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const r = raw as Record<string, unknown>;
    if ("calendarId" in r && !("calendarIds" in r)) {
      const { calendarId, ...rest } = r;
      return {
        ...rest,
        calendarIds: typeof calendarId === "string" && calendarId ? [calendarId] : [],
      };
    }
  }
  return raw;
}, ConfigShape);
export type GoogleCalendarConfig = z.infer<typeof ConfigShape>;

export const manifest: ConnectorManifest<GoogleCalendarConfig> = {
  id: "google-calendar",
  name: "Google Calendar",
  icon: <Calendar size={16} strokeWidth={1.75} aria-hidden />,
  description: "Read-only views of a Google Calendar (today, week, month, multi-week timeline).",
  auth: {
    envVars: [
      "GOOGLE_OAUTH_CLIENT_ID",
      "GOOGLE_OAUTH_CLIENT_SECRET",
      "GOOGLE_CALENDAR_REFRESH_TOKEN",
    ],
    setupDoc: "./README.md",
  },
  configSchema: ConfigSchema,
  defaultConfig: () => ({ startOfWeek: "mon", calendarIds: [] }),
  tiles: [
    "calendar-one-day",
    "calendar-one-week",
    "calendar-one-month",
    "calendar-many-weeks",
  ],
  payloadAdapters: {
    "tag-like": tagLikeAdapter,
    "clip-like": clipLikeAdapter,
    "note-like": noteLikeAdapter,
  },
  ConfigBody,
};
