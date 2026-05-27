import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getThemes } from "../index";

const THEMES_DIR = join(__dirname, "..");

/**
 * Every theme's tokens.css must target ONLY `[data-theme="<id>"]`.
 * A `:root` (or `:root,`) selector in any theme would match the html
 * element regardless of which theme is active, and — at equal
 * specificity — later cascade order wins. Since themes/index.css
 * imports them alphabetically, a `:root` rule in any one theme would
 * silently override every earlier-imported theme's tokens.
 *
 * The FOUC bootstrap always sets `data-theme` on <html> before paint,
 * so no `:root` fallback is needed.
 */
describe("theme selector isolation", () => {
  for (const theme of getThemes()) {
    it(`${theme.id} only selects on [data-theme="${theme.id}"]`, () => {
      const css = readFileSync(join(THEMES_DIR, theme.id, "tokens.css"), "utf-8");
      // Strip /* ... */ comments so doc references like ":root" inside
      // comments are ignored.
      const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
      expect(/(^|[,\s>+~])\:root\b/.test(stripped), `${theme.id}/tokens.css must not use :root selector`).toBe(false);
      expect(stripped.includes(`[data-theme="${theme.id}"]`), `${theme.id}/tokens.css must include [data-theme="${theme.id}"] selector`).toBe(true);
    });
  }
});
