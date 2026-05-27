// AUTO-GENERATED — do not edit. Run `pnpm gen:registries` to regenerate.
//
// Source of truth: each `app/themes/<id>/manifest.ts` + tokens.css.
// To add a theme: copy `_template/`, edit the manifest + tokens, run `pnpm gen:registries`.
//
import type { ThemeManifest } from "./types";
import { manifest as ayuLightManifest } from "./ayu-light/manifest";
import { manifest as catppuccinLatteManifest } from "./catppuccin-latte/manifest";
import { manifest as catppuccinMochaManifest } from "./catppuccin-mocha/manifest";
import { manifest as darkManifest } from "./dark/manifest";
import { manifest as darkPaperManifest } from "./dark-paper/manifest";
import { manifest as draculaManifest } from "./dracula/manifest";
import { manifest as draculaPaperManifest } from "./dracula-paper/manifest";
import { manifest as githubLightManifest } from "./github-light/manifest";
import { manifest as gruvboxDarkManifest } from "./gruvbox-dark/manifest";
import { manifest as gruvboxLightManifest } from "./gruvbox-light/manifest";
import { manifest as lightManifest } from "./light/manifest";
import { manifest as monokaiManifest } from "./monokai/manifest";
import { manifest as monokaiLightManifest } from "./monokai-light/manifest";
import { manifest as monokaiPaperManifest } from "./monokai-paper/manifest";
import { manifest as nordManifest } from "./nord/manifest";
import { manifest as nordPaperManifest } from "./nord-paper/manifest";
import { manifest as oneDarkProManifest } from "./one-dark-pro/manifest";
import { manifest as oneLightManifest } from "./one-light/manifest";
import { manifest as rosePineManifest } from "./rose-pine/manifest";
import { manifest as rosePineDawnManifest } from "./rose-pine-dawn/manifest";
import { manifest as rosePinePaperManifest } from "./rose-pine-paper/manifest";
import { manifest as solarizedDarkManifest } from "./solarized-dark/manifest";
import { manifest as solarizedDarkPaperManifest } from "./solarized-dark-paper/manifest";
import { manifest as solarizedLightManifest } from "./solarized-light/manifest";
import { manifest as tokyoNightManifest } from "./tokyo-night/manifest";
import { manifest as tokyoNightDayManifest } from "./tokyo-night-day/manifest";

const themes: ThemeManifest[] = [
  ayuLightManifest,
  catppuccinLatteManifest,
  catppuccinMochaManifest,
  darkManifest,
  darkPaperManifest,
  draculaManifest,
  draculaPaperManifest,
  githubLightManifest,
  gruvboxDarkManifest,
  gruvboxLightManifest,
  lightManifest,
  monokaiManifest,
  monokaiLightManifest,
  monokaiPaperManifest,
  nordManifest,
  nordPaperManifest,
  oneDarkProManifest,
  oneLightManifest,
  rosePineManifest,
  rosePineDawnManifest,
  rosePinePaperManifest,
  solarizedDarkManifest,
  solarizedDarkPaperManifest,
  solarizedLightManifest,
  tokyoNightManifest,
  tokyoNightDayManifest,
];

export function getThemes(): ThemeManifest[] {
  return themes;
}

export function getTheme(id: string): ThemeManifest | undefined {
  return themes.find((t) => t.id === id);
}

export const DEFAULT_THEME_ID = "light";
