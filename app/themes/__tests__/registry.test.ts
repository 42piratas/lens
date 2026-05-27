import { describe, expect, it } from "vitest";
import { DEFAULT_THEME_ID, getTheme, getThemes } from "../index";
import { isDarkFamily } from "../types";

const REQUIRED_KEYS = ["id", "label", "mode"] as const;
const VALID_MODES = ["light", "dark", "dark-paper"] as const;

describe("theme registry", () => {
  const themes = getThemes();

  it("registers at least the 6 v1 themes", () => {
    const ids = themes.map((t) => t.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "light",
        "dark",
        "tokyo-night",
        "catppuccin-mocha",
        "nord",
        "solarized-dark",
      ]),
    );
  });

  it("DEFAULT_THEME_ID is registered", () => {
    expect(getTheme(DEFAULT_THEME_ID)).toBeTruthy();
  });

  it("every theme has unique id", () => {
    const ids = themes.map((t) => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(themes.length);
  });

  it("every theme manifest has required fields", () => {
    for (const t of themes) {
      for (const k of REQUIRED_KEYS) {
        expect(t[k], `theme ${t.id} missing ${k}`).toBeDefined();
      }
      expect(
        VALID_MODES.includes(t.mode as (typeof VALID_MODES)[number]),
        `theme ${t.id} mode "${t.mode}" must be one of: ${VALID_MODES.join(", ")}`,
      ).toBe(true);
    }
  });

  it("getTheme returns undefined for unknown ids", () => {
    expect(getTheme("does-not-exist")).toBeUndefined();
  });

  it("groups themes by mode (at least one light, at least one dark-family)", () => {
    const lights = themes.filter((t) => t.mode === "light");
    const darks = themes.filter((t) => isDarkFamily(t.mode));
    expect(lights.length).toBeGreaterThan(0);
    expect(darks.length).toBeGreaterThan(0);
  });
});
