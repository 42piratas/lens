import { CheckSquare } from "lucide-react";
import { z } from "zod";
import type { ConnectorManifest } from "../types";
import { ConfigBody } from "./config";
import { taskListAdapter } from "./tiles/task-list";
import { taskDueAdapter } from "./tiles/task-due";

export const DUE_FILTER_OPTIONS = ["all", "today"] as const;
export type DueFilter = (typeof DUE_FILTER_OPTIONS)[number];

export const ConfigSchema = z.object({
  tasklistId: z.string().optional(),
  tasklistTitle: z.string().optional(),
  showCompleted: z.boolean().optional(),
  showHidden: z.boolean().optional(),
  lookaheadDays: z.number().int().min(1).max(60).optional(),
  dueFilter: z.enum(DUE_FILTER_OPTIONS).optional(),
});
export type GoogleTasksConfig = z.infer<typeof ConfigSchema>;

export const manifest: ConnectorManifest<GoogleTasksConfig> = {
  id: "google-tasks",
  name: "Google Tasks",
  icon: <CheckSquare size={16} strokeWidth={1.75} aria-hidden />,
  description: "Read-only views of Google Tasks (single tasklist or due across lists).",
  auth: {
    envVars: [
      "GOOGLE_OAUTH_CLIENT_ID",
      "GOOGLE_OAUTH_CLIENT_SECRET",
      "GOOGLE_CALENDAR_REFRESH_TOKEN",
    ],
    setupDoc: "./README.md",
  },
  configSchema: ConfigSchema,
  defaultConfig: () => ({ showCompleted: false, showHidden: false, lookaheadDays: 14 }),
  tiles: ["task-list", "task-due"],
  tileAdapters: {
    "task-list": taskListAdapter,
    "task-due": taskDueAdapter,
  },
  ConfigBody,
};
