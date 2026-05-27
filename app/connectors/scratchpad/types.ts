import { z } from "zod";

export const SCRATCHPAD_SCHEMA_VERSION = 2 as const;

export const boundSourceSchema = z.object({
  connector: z.string(),
  sourceId: z.string(),
  sourceTitle: z.string(),
  parentTitle: z.string().optional(),
  originalContent: z.string(),
  href: z.string().optional(),
  meta: z.record(z.string(), z.string()).optional(),
});
export type BoundSource = z.infer<typeof boundSourceSchema>;

export const scratchpadStateSchema = z.object({
  version: z.literal(SCRATCHPAD_SCHEMA_VERSION),
  binding: boundSourceSchema.nullable(),
  content: z.string(),
});
export type ScratchpadState = z.infer<typeof scratchpadStateSchema>;
