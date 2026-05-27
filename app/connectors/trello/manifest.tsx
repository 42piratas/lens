import { Kanban } from "lucide-react";
import { z } from "zod";
import type { ConnectorManifest } from "../types";
import { ConfigBody } from "./config";
import { taskListAdapter } from "./tiles/task-list";
import { taskDueAdapter } from "./tiles/task-due";
import { tagLikeAdapter } from "./payload-adapters/tag-like";
import { clipLikeAdapter } from "./payload-adapters/clip-like";
import { noteLikeAdapter } from "./payload-adapters/note-like";

export const ConfigSchema = z.object({
  boardId: z.string().optional(),
  boardName: z.string().optional(),
  listId: z.string().optional(),
  listName: z.string().optional(),
  listIds: z.array(z.string()).optional(),
  dueWithinDays: z.number().int().min(1).max(60).optional(),
});
export type TrelloConfig = z.infer<typeof ConfigSchema>;

export const manifest: ConnectorManifest<TrelloConfig> = {
  id: "trello",
  name: "Trello",
  icon: <Kanban size={16} strokeWidth={1.75} aria-hidden />,
  description: "Trello board views with cross-tile label drops.",
  auth: {
    envVars: ["TRELLO_API_KEY", "TRELLO_API_TOKEN"],
    setupDoc: "./README.md",
  },
  configSchema: ConfigSchema,
  defaultConfig: () => ({ dueWithinDays: 7 }),
  tiles: ["task-list", "kanban-board", "task-due"],
  tileAdapters: {
    "task-list": taskListAdapter,
    "task-due": taskDueAdapter,
  },
  payloadAdapters: {
    "tag-like": tagLikeAdapter,
    "clip-like": clipLikeAdapter,
    "note-like": noteLikeAdapter,
  },
  ConfigBody,
};
