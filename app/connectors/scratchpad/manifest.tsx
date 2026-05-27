import { ClipboardList } from "lucide-react";
import { z } from "zod";
import type { ConnectorManifest } from "../types";
import { ConfigBody } from "./config";
import { clipLikeAdapter } from "./payload-adapters/clip-like";

export const ConfigSchema = z.object({});
export type ScratchpadConfig = z.infer<typeof ConfigSchema>;

export const manifest: ConnectorManifest<ScratchpadConfig> = {
  id: "scratchpad",
  name: "Scratchpad",
  icon: <ClipboardList size={16} strokeWidth={1.75} aria-hidden />,
  description:
    "Local buffer of clipped items from other cards. Items absorb via the click-to-clip path (b02-06).",
  auth: { envVars: [], setupDoc: "./README.md" },
  configSchema: ConfigSchema,
  defaultConfig: () => ({}),
  tiles: ["note-buffer"],
  payloadAdapters: { "clip-like": clipLikeAdapter },
  ConfigBody,
};
