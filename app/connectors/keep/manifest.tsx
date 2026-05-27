import { StickyNote } from "lucide-react";
import { z } from "zod";
import type { ConnectorManifest } from "../types";
import { ConfigBody } from "./config";
import { noteCardsAdapter } from "./tiles/note-cards";

export const ConfigSchema = z.object({
  filter: z.enum(["recent", "label"]).optional(),
  label: z.string().optional(),
});
export type KeepConfig = z.infer<typeof ConfigSchema>;

export const manifest: ConnectorManifest<KeepConfig> = {
  id: "keep",
  name: "Google Keep",
  icon: <StickyNote size={16} strokeWidth={1.75} aria-hidden />,
  description:
    "Read-only views of your Google Keep notes (recent feed, by label). Requires a Google Workspace account — Google's Keep REST API is not available to personal Gmail.",
  auth: {
    envVars: [],
    setupDoc: "./README.md",
  },
  configSchema: ConfigSchema,
  defaultConfig: () => ({ filter: "recent" }),
  tiles: ["note-cards"],
  tileAdapters: {
    "note-cards": noteCardsAdapter,
  },
  ConfigBody,
};
