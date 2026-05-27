import "server-only";
import { getAccessToken } from "./auth";
import { IntegrationError, type Task, type Tasklist } from "./types";

const API = "https://tasks.googleapis.com/tasks/v1";
const CACHE_TTL_MS = 60_000;

type CacheEntry<T> = { value: T; expiresAt: number };

let tasklistsCache: CacheEntry<Tasklist[]> | null = null;
const tasksCache = new Map<string, CacheEntry<Task[]>>();

async function gFetch(path: string): Promise<unknown> {
  const token = await getAccessToken();
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch (err) {
    throw new IntegrationError("network", (err as Error).message);
  }
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new IntegrationError("auth", `Tasks API ${res.status}`);
    }
    if (res.status === 429) {
      throw new IntegrationError("rate-limit", `Tasks API rate-limited`);
    }
    if (res.status === 404) {
      throw new IntegrationError("unknown", `Tasks API 404 — tasklist not found`);
    }
    throw new IntegrationError("unknown", `Tasks API ${res.status}`);
  }
  return text ? JSON.parse(text) : {};
}

type RawTasklist = { id: string; title: string };
type RawTask = {
  id: string;
  title?: string;
  notes?: string;
  due?: string;
  status?: string;
  completed?: string;
  position?: string;
  hidden?: boolean;
};

export async function listTasklists(): Promise<Tasklist[]> {
  if (tasklistsCache && tasklistsCache.expiresAt > Date.now()) return tasklistsCache.value;
  const data = (await gFetch(`/users/@me/lists?maxResults=100`)) as { items?: RawTasklist[] };
  const lists: Tasklist[] = (data.items ?? []).map((t) => ({ id: t.id, title: t.title ?? "" }));
  lists.sort((a, b) => a.title.localeCompare(b.title));
  tasklistsCache = { value: lists, expiresAt: Date.now() + CACHE_TTL_MS };
  return lists;
}

type ListTasksArgs = {
  tasklistId: string;
  tasklistTitle?: string;
  showCompleted?: boolean;
  showHidden?: boolean;
  dueMin?: string;
  dueMax?: string;
};

function tasksKey(args: ListTasksArgs): string {
  return [
    args.tasklistId,
    args.showCompleted ? "1" : "0",
    args.showHidden ? "1" : "0",
    args.dueMin ?? "",
    args.dueMax ?? "",
  ].join("::");
}

export async function listTasks(args: ListTasksArgs): Promise<Task[]> {
  const key = tasksKey(args);
  const hit = tasksCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const params = new URLSearchParams();
  params.set("maxResults", "100");
  params.set("showCompleted", args.showCompleted ? "true" : "false");
  if (args.showCompleted) params.set("showDeleted", "false");
  params.set("showHidden", args.showHidden ? "true" : "false");
  if (args.dueMin) params.set("dueMin", args.dueMin);
  if (args.dueMax) params.set("dueMax", args.dueMax);

  const data = (await gFetch(
    `/lists/${encodeURIComponent(args.tasklistId)}/tasks?${params.toString()}`,
  )) as { items?: RawTask[] };

  const tasklistTitle = args.tasklistTitle ?? "";
  const tasks: Task[] = (data.items ?? []).map((t) => ({
    id: t.id,
    title: t.title ?? "",
    notes: t.notes,
    due: t.due,
    status: t.status === "completed" ? "completed" : "needsAction",
    completed: t.completed,
    position: t.position ?? "",
    tasklistId: args.tasklistId,
    tasklistTitle,
  }));
  tasks.sort((a, b) => a.position.localeCompare(b.position));

  tasksCache.set(key, { value: tasks, expiresAt: Date.now() + CACHE_TTL_MS });
  return tasks;
}

export async function listTasksAcrossAll(args: {
  showHidden?: boolean;
  dueMin?: string;
  dueMax?: string;
}): Promise<Task[]> {
  const lists = await listTasklists();
  const all = await Promise.all(
    lists.map((l) =>
      listTasks({
        tasklistId: l.id,
        tasklistTitle: l.title,
        showCompleted: false,
        showHidden: args.showHidden,
        dueMin: args.dueMin,
        dueMax: args.dueMax,
      }),
    ),
  );
  const flat = all.flat().filter((t) => Boolean(t.due));
  flat.sort((a, b) => {
    const da = a.due ? new Date(a.due).getTime() : Number.POSITIVE_INFINITY;
    const db = b.due ? new Date(b.due).getTime() : Number.POSITIVE_INFINITY;
    return da - db;
  });
  return flat;
}

export function _resetTasksCache() {
  tasklistsCache = null;
  tasksCache.clear();
}
