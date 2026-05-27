# app/themes

Folder-modular theme registry. Mirror shape: `app/connectors/` and `app/tiles/`.

## Contract

Every theme is a self-contained module under `app/themes/<id>/`:

- `manifest.ts` — exports `manifest: ThemeManifest` with `{ id, label, mode, source? }`
- `tokens.css` — `[data-theme="<id>"] { ...tokens... }` rule defining every required token
- `README.md` — palette source / attribution

Light is special: its tokens.css uses `:root, [data-theme="light"]` so it is **also** the universal fallback when no `data-theme` attribute is set (e.g. JS disabled, pre-bootstrap paint).

## Required tokens

Every theme MUST define all tokens enumerated in `__tests__/tokens-coverage.test.ts`. Missing tokens fall through to Light's `:root` block, which produces unreadable surfaces on dark themes. The contract test fails CI when any theme is incomplete.

Tokens fall into seven groups:

| Group | Tokens | Purpose |
|---|---|---|
| Surface | `--surface, --surface-alt, --surface-muted, --surface-raised, --border` | Backgrounds + dividers |
| Foreground | `--fg, --fg-2, --fg-muted, --fg-disabled` | Text |
| Accent | `--accent, --accent-hover, --accent-solid, --accent-solid-hover, --accent-soft, --accent-border, --accent-focus, --accent-on` | Brand action color |
| Link | `--link, --link-hover` | Hyperlinks |
| OKR palette | `--okr-{1..4}, --okr-{1..4}-soft, --okr-{1..4}-border, --okr-{1..4}-ink` | OKR-style chip groupings |
| Chart palette | `--chart-{1..6}, --chart-grid, --chart-axis` | Categorical chart series |
| Label palette | `--label-{green,yellow,orange,red,purple,blue,sky,lime,pink,black,gray}` | Trello / Keep / generic chip colors |
| Shadow | `--shadow-card` | Card depth (heavier on dark) |

Connectors NEVER reference raw 42labs DS tokens (`var(--copper)`, `var(--emerald)`) — they go through the semantic layer (`var(--label-orange)`, `var(--label-green)`). Each theme remaps the semantic layer; raw 42labs tokens stay constant in `globals.css` as the platform brand canvas.

## Registry

`app/themes/index.ts` lists registered manifests as an explicit array. Helpers:

- `getThemes()` — every registered theme manifest
- `getTheme(id)` — `ThemeManifest | undefined`
- `DEFAULT_THEME_ID` — `"light"`

The companion CSS aggregator `app/themes/index.css` `@import`s each theme's `tokens.css`. `globals.css` imports it once. Adding a theme = edit two files: `index.ts` (TS registry) + `index.css` (CSS imports).

## Theme store

`lib/theme/store.ts` holds:

- `theme` — currently active theme id
- `lightThemeId` — preferred light-mode theme (default `"light"`)
- `darkThemeId` — preferred dark-mode theme (default `"dark"`)

`setTheme(id)` updates `theme` AND the per-mode preference. `toggle()` swaps between `lightThemeId` ↔ `darkThemeId`. The settings page (deferred) will let the user explicitly set the two preferences without having to "visit" each one.

Persisted under three keys:

- `lens.theme` — active id
- `lens.theme.light` — light pick
- `lens.theme.dark` — dark pick

The inline `THEME_BOOTSTRAP_SCRIPT` runs in `<head>` to apply the active theme before paint. Unknown ids in localStorage are tolerated by the bootstrap (any string passes through to `data-theme`); the React store reconciles them to `DEFAULT_THEME_ID` post-hydration.

## Adding a theme

See the full cookbook with checklist: [`docs/contrib/add-a-theme.md`](../../docs/contrib/add-a-theme.md). Short version:

1. Copy `_template/` to `<id>/`
2. Replace the selector to `[data-theme="<id>"]`
3. Fill all required tokens with palette values
4. Update `manifest.ts` (id, label, mode, source)
5. Run `pnpm gen:registries` — regenerates `themes/index.ts` and `themes/index.css`
6. Run `pnpm test --run themes` — the tokens-coverage test will fail with the list of any tokens you missed
7. Verify visually: cycle through all 14 tile types under your theme

## v1 bundled themes (20: 10 light + 10 dark)

### Light (10)

| Id | Label | Source |
|---|---|---|
| `light` | 42labs Light | 42labs DS — canvas-warm + copper |
| `catppuccin-latte` | Catppuccin Latte | catppuccin.com (Latte flavor) |
| `solarized-light` | Solarized Light | ethanschoonover.com/solarized |
| `tokyo-night-day` | Tokyo Night Day | enkia/tokyo-night-vscode-theme (Day) |
| `rose-pine-dawn` | Rosé Pine Dawn | rosepinetheme.com (Dawn) |
| `github-light` | GitHub Light | github.com/primer/primitives |
| `gruvbox-light` | Gruvbox Light | github.com/morhetz/gruvbox (Light Medium) |
| `one-light` | One Light | github.com/atom/one-light-syntax |
| `ayu-light` | Ayu Light | github.com/dempfi/ayu (Light) |
| `monokai-light` | Monokai Light | Monokai light inversion — warm off-white surface |

### Dark (10)

| Id | Label | Source |
|---|---|---|
| `dark` | 42labs Dark | 42labs DS — void + mint |
| `catppuccin-mocha` | Catppuccin Mocha | catppuccin.com (Mocha flavor) |
| `solarized-dark` | Solarized Dark | ethanschoonover.com/solarized |
| `tokyo-night` | Tokyo Night | enkia/tokyo-night-vscode-theme (Storm) |
| `nord` | Nord | nordtheme.com |
| `rose-pine` | Rosé Pine | rosepinetheme.com (Main) |
| `dracula` | Dracula | draculatheme.com |
| `gruvbox-dark` | Gruvbox Dark | github.com/morhetz/gruvbox (Dark Medium) |
| `one-dark-pro` | One Dark Pro | github.com/Binaryify/OneDark-Pro |
| `monokai` | Monokai | monokai.pro (Wimer Hazenberg) |

**Pairs (8):** 42labs · Catppuccin · Solarized · Tokyo Night · Rosé Pine · Gruvbox · One · Monokai.
**Solo light:** GitHub Light, Ayu Light · **Solo dark:** Nord, Dracula.

The toggle button uses each user's per-mode picks (`lens.theme.light` / `lens.theme.dark`); the picker auto-grows as more themes are registered.

## Paper-on-dark pattern (`mode: "dark-paper"`)

A third mode value sits alongside `light` and `dark`: **`dark-paper`** is a variant of dark where the page canvas and sidebar stay dark, but tile bodies and inner cards flip to light "paper" surfaces. This gives strong contrast where the eye looks (the cards) without the eye-fatigue of a fully-light dashboard.

The pattern is a single shared CSS file — **`_paper-pattern.css`** — that targets `[data-theme-mode="dark-paper"]`. The inline FOUC bootstrap reads the active theme's mode from `localStorage["lens.theme.mode"]` and writes the attribute on `<html>` synchronously before paint.

### How the cascade works

Inside `.lens-card-chrome`, the pattern re-declares the surface family (`--surface`, `--surface-alt`, `--surface-raised`, `--border`) and the foreground family (`--fg`, `--fg-2`, `--fg-muted`, `--fg-disabled`) to the theme's paper-layer tokens. Because CSS custom properties cascade per element, any descendant using `var(--surface)`, `var(--fg)`, `var(--border)` etc. inside a card resolves to paper; outside cards (sidebar, canvas), it resolves to the theme's dark values from root.

`--surface-muted` is intentionally NOT re-declared inside cards — the tile header strip's `background: var(--surface-muted)` keeps resolving to the theme's dark header tone.

Accent / OKR / chart / label palettes are also NOT re-declared inside cards. Selective-contrast palettes (Solarized) are designed so the same accent reads on both ends; for other themes, pick accents that read on both dark and paper surfaces.

### Required paper-layer tokens

Any theme with `mode: "dark-paper"` must declare these 10 tokens (enforced by the tokens-coverage test):

| Token | Purpose |
|---|---|
| `--paper-surface` | Primary paper bg (cards, single-content tile bodies) |
| `--paper-surface-muted` | Slightly darker paper bg (multi-card tile bodies, layer below inner cards) |
| `--paper-fg` | Primary body text on paper |
| `--paper-fg-2` | Secondary text on paper |
| `--paper-fg-muted` | Muted text on paper |
| `--paper-border` | Border on paper elements |
| `--paper-shadow` | Drop-shadow tuned for inner cards lifting on muted body |
| `--paper-accent-on` | Text-on-accent inside paper cards |
| `--header-fg` | Light text on dark tile header strip + macro day labels |
| `--sidebar-icon` | Sidebar icon color (typically same as `--header-fg`) |

### Adding a paper variant of an existing dark theme

1. **Copy** the existing dark theme folder: `cp -r app/themes/<theme> app/themes/<theme>-paper`
2. **Edit `<theme>-paper/manifest.ts`**: change `id` to `"<theme>-paper"`, append "Paper" to `label`, and set `mode: "dark-paper"`.
3. **Edit `<theme>-paper/tokens.css`**:
   - Keep all base canonical tokens (canvas, sidebar, accent, OKR, label, chart palettes — same as the source dark theme).
   - **Add the 10 paper-layer tokens**, picking light tones from the theme's palette. Most dark palettes ship light surfaces — Solarized has base2/base3, Nord has Snow Storm (nord4–6), Gruvbox has fg0, Catppuccin Mocha has text/subtext, etc.
   - Drop any `[data-theme="<id>"] .lens-card-chrome { … }` overrides — `_paper-pattern.css` handles them.
4. Run `pnpm gen:registries` — regenerates `themes/index.ts` and `themes/index.css`.
5. Run `pnpm test --run themes` — the tokens-coverage test will fail with the list of any paper tokens you missed.
6. The settings picker auto-includes it under the Dark group.

### Reference implementation

`solarized-dark-paper/` is the canonical paper variant — uses only Solarized's 16-color palette (base03..base3 + the 8 accent hues). Read its `tokens.css` to see the full mapping from semantic paper-layer roles to Solarized values.

## Tests

- `__tests__/registry.test.ts` — registry shape (uniqueness, required fields, mode validation, default-id presence)
- `__tests__/tokens-coverage.test.ts` — every theme's `tokens.css` declares every required token (base set for all themes; paper-layer set additionally for `mode: "dark-paper"` themes). Regex-based; doesn't catch typos in the *value*, only in the *key*.
