import { z } from "zod";

export const PINBOARD_SCHEMA_VERSION = 1 as const;

/** Trimmed URL with an `http(s)` scheme. */
export const pinUrlSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (raw) => {
      try {
        const u = new URL(raw);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Must be an http(s) URL" },
  );

/**
 * A single pin.
 *
 * `icon` is a lucide-react kebab-case name (e.g. `"book-open"`). The empty
 * string means "use the favicon fetched from `url`" — that's the default
 * resolution path until the user explicitly picks a lucide override.
 */
export const pinSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(80),
  url: pinUrlSchema,
  icon: z.string().max(80),
  order: z.number().int().nonnegative(),
});

export const pinboardStateSchema = z.object({
  version: z.literal(PINBOARD_SCHEMA_VERSION),
  enabled: z.boolean(),
  pins: z.array(pinSchema),
});

export type Pin = z.infer<typeof pinSchema>;
export type PinboardState = z.infer<typeof pinboardStateSchema>;

export const EMPTY_PINBOARD_STATE: PinboardState = {
  version: PINBOARD_SCHEMA_VERSION,
  enabled: false,
  pins: [],
};
