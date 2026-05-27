import { BookOpen } from "lucide-react";
import { z } from "zod";
import type { ConnectorManifest } from "../types";
import { MEDIA_DISPLAY_OPTIONS } from "@/tiles/media-list/types";
import { ConfigBody } from "./config";
import { mediaListAdapter } from "./tiles/media-list";

export const ConfigSchema = z.object({
  userId: z
    .string()
    .regex(/^\d+$/, "User ID must be numeric")
    .optional(),
  shelfName: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Shelf must be lowercase letters, digits, hyphens")
    .optional(),
  limit: z.number().int().min(1).max(50).optional(),
  display: z
    .preprocess((val) => {
      if (typeof val === "boolean") return val ? "full" : "title-subtitle";
      if (val === "title-author") return "title-subtitle";
      return val;
    }, z.enum(MEDIA_DISPLAY_OPTIONS))
    .optional(),
});
export type GoodreadsConfig = z.infer<typeof ConfigSchema>;

export const manifest: ConnectorManifest<GoodreadsConfig> = {
  id: "goodreads",
  name: "Goodreads",
  icon: <BookOpen size={16} strokeWidth={1.75} aria-hidden />,
  description:
    "Per-shelf book list from a public Goodreads profile (RSS, no auth).",
  auth: { envVars: [], setupDoc: "./README.md" },
  configSchema: ConfigSchema,
  defaultConfig: () => ({ shelfName: "currently-reading", limit: 20, display: "full" }),
  tiles: ["media-list"],
  tileAdapters: {
    "media-list": mediaListAdapter,
  },
  ConfigBody,
};
