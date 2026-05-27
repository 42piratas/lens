import { z } from "zod";

const sourceSchema = z
  .object({
    connector: z.string().min(1),
    sourceId: z.string().min(1).optional(),
  })
  .optional();

const requiredSourceSchema = z.object({
  connector: z.string().min(1),
  sourceId: z.string().min(1),
});

export const tagLikeSchema = z.object({
  kind: z.literal("tag-like"),
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
  source: sourceSchema,
});

export const clipLikeSchema = z.object({
  kind: z.literal("clip-like"),
  label: z.string().min(1),
  source: requiredSourceSchema,
  parentTitle: z.string().optional(),
  originalContent: z.string(),
  href: z.string().min(1).optional(),
  meta: z.record(z.string(), z.string()).optional(),
});

export const noteLikeSchema = z.object({
  kind: z.literal("note-like"),
  title: z.string().optional(),
  body: z.string().min(1),
  source: sourceSchema,
});

export const dragPayloadSchema = z.discriminatedUnion("kind", [
  tagLikeSchema,
  clipLikeSchema,
  noteLikeSchema,
]);
