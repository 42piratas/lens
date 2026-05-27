export type TaskLabel = { name: string; color?: string };
export type TaskBadges = {
  checklists?: { done: number; total: number };
  attachments?: number;
  comments?: number;
};
export type TaskItem = {
  id: string;
  title: string;
  /** When defined, renders a checkbox; undefined means no completion concept (e.g. trello cards). */
  done?: boolean;
  /** ISO timestamp. */
  due?: string;
  labels?: TaskLabel[];
  badges?: TaskBadges;
  /** Editable body text — Trello card desc, Google Tasks notes. Empty when unset. */
  body?: string;
  /** Container title shown in the scratchpad title bar — Trello list, tasklist name. */
  parentTitle?: string;
};

export type TaskListData = TaskItem[];
