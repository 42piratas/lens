import type { KeepColor } from "../types";

/**
 * Keep notes carry a per-note color. We return a CSS class — the rule lives in
 * globals.css `.lens-keep-note--<color>` and resolves to a DS palette token
 * (light + dark variants). Never returns raw hex.
 */
export function keepColorClass(color: KeepColor): string {
  const slug = color.toLowerCase();
  return `lens-keep-note--${slug}`;
}
