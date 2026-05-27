"use client";

import type { TileAdapter } from "@/tiles/types";
import type { TaskListData } from "@/tiles/task-list/types";
import type { GoogleTasksConfig } from "../manifest";
import { useGoogleTasksList } from "../hooks/use-tasks-list";
import { isDueToday } from "../_shared/utils";

export const taskListAdapter: TileAdapter<GoogleTasksConfig, TaskListData> = {
  useData(card) {
    const { tasklistId, showCompleted, showHidden, dueFilter = "all" } = card.config;
    const enabled = Boolean(tasklistId);
    const { data, isLoading, error } = useGoogleTasksList(
      { tasklistId, showCompleted, showHidden },
      enabled,
    );
    if (!data) return { data: undefined, isLoading, error };
    const filtered =
      dueFilter === "today" ? data.filter((t) => t.due && isDueToday(t.due)) : data;
    return {
      data: filtered.map((t) => ({
        id: t.id,
        title: t.title || "(untitled)",
        done: t.status === "completed",
        due: dueFilter === "today" ? undefined : t.due,
        body: t.notes ?? "",
        parentTitle: card.config.tasklistTitle,
      })),
      isLoading,
      error,
    };
  },
  topbarLabel: (card) => card.config.tasklistTitle?.toUpperCase(),
  topbarHref: () => "https://tasks.google.com/",
};
