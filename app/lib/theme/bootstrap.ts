/**
 * Theme persistence keys + inline FOUC bootstrap.
 *
 * Four keys are persisted:
 *   - `lens.theme`        — currently active theme id (string)
 *   - `lens.theme.mode`   — active theme's mode value ("light" | "dark" | "dark-paper").
 *                           Bootstrap writes `data-theme-mode` from this so the
 *                           shared `_paper-pattern.css` selectors can fire before
 *                           React hydrates.
 *   - `lens.theme.light`  — preferred light-mode pick (id or "light")
 *   - `lens.theme.dark`   — preferred dark-mode pick (id or "dark")
 *
 * The bootstrap script applies the active theme synchronously in <head>
 * before paint. It can't read the registry (which is JS-only), so it
 * accepts any non-empty string id/mode and the React store reconciles
 * unknown values back to defaults after hydration.
 */
export const THEME_STORAGE_KEY = "lens.theme";
export const THEME_MODE_STORAGE_KEY = "lens.theme.mode";
export const LIGHT_PICK_STORAGE_KEY = "lens.theme.light";
export const DARK_PICK_STORAGE_KEY = "lens.theme.dark";

export const DEFAULT_LIGHT_PICK = "light";
export const DEFAULT_DARK_PICK = "dark";
export const DEFAULT_THEME_MODE = "light";

export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var stored=localStorage.getItem("${THEME_STORAGE_KEY}");var theme=(typeof stored==="string"&&stored.length>0)?stored:"${DEFAULT_LIGHT_PICK}";document.documentElement.setAttribute("data-theme",theme);var mode=localStorage.getItem("${THEME_MODE_STORAGE_KEY}");document.documentElement.setAttribute("data-theme-mode",(typeof mode==="string"&&mode.length>0)?mode:"${DEFAULT_THEME_MODE}");}catch(e){document.documentElement.setAttribute("data-theme","${DEFAULT_LIGHT_PICK}");document.documentElement.setAttribute("data-theme-mode","${DEFAULT_THEME_MODE}");}})();`;
