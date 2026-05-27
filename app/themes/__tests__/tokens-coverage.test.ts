import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getThemes } from "../index";

const THEMES_DIR = join(__dirname, "..");

/**
 * Every theme's tokens.css must define each of these custom properties.
 * Missing tokens fall through to whatever Light defines, which usually
 * looks broken on dark surfaces — the contract test catches this at CI time.
 */
const REQUIRED_TOKENS = [
  // surface
  "--surface",
  "--surface-alt",
  "--surface-muted",
  "--surface-raised",
  "--border",
  // foreground
  "--fg",
  "--fg-2",
  "--fg-muted",
  "--fg-disabled",
  // accent
  "--accent",
  "--accent-hover",
  "--accent-solid",
  "--accent-solid-hover",
  "--accent-soft",
  "--accent-border",
  "--accent-focus",
  "--accent-on",
  // link
  "--link",
  "--link-hover",
  // okr palette (4 sets)
  "--okr-1",
  "--okr-1-soft",
  "--okr-1-border",
  "--okr-1-ink",
  "--okr-2",
  "--okr-2-soft",
  "--okr-2-border",
  "--okr-2-ink",
  "--okr-3",
  "--okr-3-soft",
  "--okr-3-border",
  "--okr-3-ink",
  "--okr-4",
  "--okr-4-soft",
  "--okr-4-border",
  "--okr-4-ink",
  // chart palette
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
  "--chart-6",
  "--chart-grid",
  "--chart-axis",
  // label palette
  "--label-green",
  "--label-yellow",
  "--label-orange",
  "--label-red",
  "--label-purple",
  "--label-blue",
  "--label-sky",
  "--label-lime",
  "--label-pink",
  "--label-black",
  "--label-gray",
  // shadow
  "--shadow-card",
];

/**
 * Additional paper-layer tokens required for any theme with `mode: "dark-paper"`.
 * Pattern rules in `_paper-pattern.css` read from these; missing tokens make
 * the paper cascade fall through to undefined and produce broken visuals.
 */
const REQUIRED_PAPER_TOKENS = [
  "--paper-surface",
  "--paper-surface-muted",
  "--paper-fg",
  "--paper-fg-2",
  "--paper-fg-muted",
  "--paper-border",
  "--paper-shadow",
  "--paper-accent-on",
  "--header-fg",
  "--sidebar-icon",
];

describe("theme tokens coverage", () => {
  for (const theme of getThemes()) {
    it(`${theme.id} defines all required tokens`, () => {
      const css = readFileSync(join(THEMES_DIR, theme.id, "tokens.css"), "utf-8");
      const expected =
        theme.mode === "dark-paper"
          ? [...REQUIRED_TOKENS, ...REQUIRED_PAPER_TOKENS]
          : REQUIRED_TOKENS;
      const missing: string[] = [];
      for (const token of expected) {
        // Match `--token-name:` (declaration LHS), allowing arbitrary whitespace.
        const re = new RegExp(`\\${token}\\s*:`);
        if (!re.test(css)) missing.push(token);
      }
      expect(missing, `${theme.id} missing tokens: ${missing.join(", ")}`).toEqual([]);
    });
  }
});
