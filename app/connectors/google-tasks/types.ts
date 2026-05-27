export type Tasklist = { id: string; title: string };

export type TaskStatus = "needsAction" | "completed";

export type Task = {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  status: TaskStatus;
  completed?: string;
  position: string;
  tasklistId: string;
  tasklistTitle: string;
};

export { IntegrationError } from "../_shared/integration-error";
export type { IntegrationErrorKind } from "../_shared/integration-error";
