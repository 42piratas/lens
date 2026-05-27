import { z } from "zod";
import { GRID_DIM } from "@/lib/grid/geometry";

export const LAYOUT_SCHEMA_VERSION = 2 as const;

export const layoutCardSchema = z.object({
  id: z.string().min(1),
  connector: z.string().min(1),
  tile: z.string().min(1),
  x: z.number().int().min(0).max(GRID_DIM - 1),
  y: z.number().int().min(0).max(GRID_DIM - 1),
  w: z.number().int().min(1).max(GRID_DIM),
  h: z.number().int().min(1).max(GRID_DIM),
  config: z.unknown(),
});

export const layoutStateSchema = z.object({
  version: z.literal(LAYOUT_SCHEMA_VERSION),
  cards: z.array(layoutCardSchema),
});

export type LayoutState = z.infer<typeof layoutStateSchema>;
export type LayoutCardRecord = z.infer<typeof layoutCardSchema>;
