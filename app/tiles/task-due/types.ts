import type { TaskItem } from "../task-list/types";

export type TaskDueItem = TaskItem & {
  /** Source list / source group title — shown as a per-row caption when present. */
  groupTitle?: string;
};

export type TaskDueData = TaskDueItem[];
