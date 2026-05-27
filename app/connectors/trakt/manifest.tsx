import { Clapperboard } from "lucide-react";
import { z } from "zod";
import type { ConnectorManifest } from "../types";
import { MEDIA_DISPLAY_OPTIONS } from "@/tiles/media-list/types";
import { ConfigBody } from "./config";
import { mediaListAdapter } from "./tiles/media-list";

export const ConfigSchema = z.object({
  username: z
    .string()
    .regex(/^[a-z0-9_-]+$/, "Username must be lowercase letters, digits, underscore, hyphen")
    .optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, digits, hyphens")
    .optional(),
  listName: z.string().optional(),
  limit: z.number().int().min(1).max(50).optional(),
  display: z.enum(MEDIA_DISPLAY_OPTIONS).optional(),
});
export type TraktConfig = z.infer<typeof ConfigSchema>;

export const manifest: ConnectorManifest<TraktConfig> = {
  id: "trakt",
  name: "Trakt",
  icon: <Clapperboard size={16} strokeWidth={1.75} aria-hidden />,
  description: "Movies + TV from a public Trakt user list.",
  auth: {
    envVars: ["TRAKT_CLIENT_ID"],
    setupDoc: "./README.md",
  },
  configSchema: ConfigSchema,
  defaultConfig: () => ({ limit: 20, display: "full" }),
  tiles: ["media-list"],
  tileAdapters: {
    "media-list": mediaListAdapter,
  },
  ConfigBody,
};
