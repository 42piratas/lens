"use client";

import type { TileAdapter } from "@/tiles/types";
import type { TaskDueData } from "@/tiles/task-due/types";
import type { GoogleTasksConfig } from "../manifest";
import { useGoogleTasksDue } from "../hooks/use-tasks-due";
import { clamp, isDueToday } from "../_shared/utils";

export const taskDueAdapter: TileAdapter<GoogleTasksConfig, TaskDueData> = {
  useData(card) {
    const lookaheadDays = clamp(card.config.lookaheadDays ?? 14, 1, 60);
    const { showHidden, dueFilter = "all" } = card.config;
    const { data, isLoading, error } = useGoogleTasksDue({ lookaheadDays, showHidden });
    if (!data) return { data: undefined, isLoading, error };
    const filtered =
      dueFilter === "today" ? data.filter((t) => t.due && isDueToday(t.due)) : data;
    return {
      data: filtered.map((t) => ({
        id: `${t.tasklistId}::${t.id}`,
        title: t.title || "(untitled)",
        done: false,
        due: dueFilter === "today" ? undefined : t.due,
        groupTitle: t.tasklistTitle,
        body: t.notes ?? "",
        parentTitle: t.tasklistTitle,
      })),
      isLoading,
      error,
    };
  },
  topbarLabel: (card) => {
    const days = clamp(card.config.lookaheadDays ?? 14, 1, 60);
    return `DUE IN NEXT ${days}D`;
  },
  topbarHref: () => "https://tasks.google.com/",
};
