import { z } from "zod";
import { layoutCardSchema } from "@/lib/layout/schema";

export const WORKSPACES_SCHEMA_VERSION = 1 as const;

/** Workspace = saved snapshot of dashboard state. */
export const workspaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Lucide icon name (e.g. "Briefcase"). UI maps via the icon registry. */
  icon: z.string().min(1),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  /** Active theme id for this workspace. */
  theme: z.string().min(1),
  /** Per-workspace card layout. */
  layout: z.array(layoutCardSchema),
});

export const workspacesStateSchema = z.object({
  version: z.literal(WORKSPACES_SCHEMA_VERSION),
  activeId: z.string().min(1),
  workspaces: z.array(workspaceSchema).min(1),
});

export type Workspace = z.infer<typeof workspaceSchema>;
export type WorkspacesState = z.infer<typeof workspacesStateSchema>;
