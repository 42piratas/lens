/**
 * Global UI preferences — persistence keys + inline FOUC bootstrap.
 *
 * Two keys, both global (not workspace-scoped):
 *   - `lens.prefs.fontScale`     — number string, body type-scale multiplier (default 1)
 *   - `lens.prefs.dockPos`       — `"left" | "right"` (default "left")
 *
 * Legacy keys migrated on read (bootstrap script + store hydrate):
 *   - `lens.prefs.sidebarPos`    — renamed to `lens.prefs.dockPos` (b02-11)
 *
 * The bootstrap script runs synchronously in <head> before paint so the
 * dock position and font scale are applied before first render.
 */
export const FONT_SCALE_STORAGE_KEY = "lens.prefs.fontScale";
export const DOCK_POS_STORAGE_KEY = "lens.prefs.dockPos";
export const LEGACY_SIDEBAR_POS_STORAGE_KEY = "lens.prefs.sidebarPos";

export const DEFAULT_FONT_SCALE = 1;
export const FONT_SCALE_MIN = 0.85;
export const FONT_SCALE_MAX = 1.4;
export const FONT_SCALE_STEP = 0.05;

export type DockPos = "left" | "right";
export const DEFAULT_DOCK_POS: DockPos = "left";

export const PREFS_BOOTSTRAP_SCRIPT = `(function(){try{var fs=parseFloat(localStorage.getItem("${FONT_SCALE_STORAGE_KEY}"));if(!isFinite(fs)||fs<${FONT_SCALE_MIN}||fs>${FONT_SCALE_MAX})fs=${DEFAULT_FONT_SCALE};document.documentElement.style.setProperty("--font-scale",String(fs));var sp=localStorage.getItem("${DOCK_POS_STORAGE_KEY}");if(sp==null){var old=localStorage.getItem("${LEGACY_SIDEBAR_POS_STORAGE_KEY}");if(old==="left"||old==="right"){sp=old;localStorage.setItem("${DOCK_POS_STORAGE_KEY}",old);localStorage.removeItem("${LEGACY_SIDEBAR_POS_STORAGE_KEY}");}}if(sp!=="left"&&sp!=="right")sp="${DEFAULT_DOCK_POS}";document.documentElement.setAttribute("data-dock-pos",sp);}catch(e){document.documentElement.style.setProperty("--font-scale","1");document.documentElement.setAttribute("data-dock-pos","${DEFAULT_DOCK_POS}");}})();`;
