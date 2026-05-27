/**
 * Theme system contract.
 *
 * Every theme is a self-contained module under `app/themes/<id>/`:
 *   - `manifest.ts`  — the {@link ThemeManifest} (id, label, mode, icon)
 *   - `tokens.css`   — `[data-theme="<id>"]` block defining all semantic tokens
 *   - `README.md`    — palette source + how to mirror
 *
 * Tokens live in CSS so the inline FOUC bootstrap can apply a theme
 * before React hydrates. The TS manifest only describes metadata;
 * the actual paint comes from the CSS file.
 */
/**
 * Theme mode classification.
 *
 * - `"light"` — canvas + cards both light (e.g. 42labs Light, Catppuccin Latte).
 * - `"dark"` — canvas + cards both dark (e.g. 42labs Dark, Solarized Dark).
 * - `"dark-paper"` — canvas + sidebar dark, but tile bodies + inner cards
 *   flip to light paper surfaces (paper-on-dark pattern). Requires the
 *   theme to declare the paper-layer tokens enforced by the
 *   tokens-coverage test; pattern rules live in `_paper-pattern.css`.
 *   Toggle / picker treat `dark-paper` as part of the "dark" family.
 */
export type ThemeMode = "light" | "dark" | "dark-paper";

/** True when the mode renders against a dark canvas/sidebar. Use in toggle
 *  logic and picker grouping — paper themes are dark-family by canvas. */
export const isDarkFamily = (mode: ThemeMode): boolean =>
  mode === "dark" || mode === "dark-paper";

export type ThemeManifest = {
  /** URL-safe id, e.g. `tokyo-night`. Becomes `[data-theme="<id>"]`. */
  id: string;
  /** Human-readable label, shown in the picker. */
  label: string;
  /** Determines whether the theme is grouped under Light / Dark in the picker. */
  mode: ThemeMode;
  /** One-line provenance ("Mirrored from Tokyo Night Storm by enkia"). */
  source?: string;
};
