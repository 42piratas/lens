# Add a theme

A **theme** in LENS is a folder under `app/themes/<id>/` containing a manifest + a `tokens.css`. The selection mechanism is `<html data-theme="<id>">` — themes redefine semantic CSS custom properties at that selector.

Read first: [`app/themes/README.md`](../../app/themes/README.md) — the required-tokens list and the modal classification (light vs dark).

## What a theme folder looks like

```
app/themes/<id>/
  manifest.ts            ThemeManifest — id, label, mode, source
  tokens.css             [data-theme="<id>"] selector with every required token
  README.md              optional — palette source, design notes
```

## Step-by-step

1. **Copy the template.**
   ```bash
   cp -r app/themes/_template app/themes/<your-id>
   ```
2. **Edit `manifest.ts`.**
   ```ts
   export const manifest: ThemeManifest = {
     id: "<your-id>",
     label: "Pretty Name",
     mode: "light",        // or "dark"
     source: "Origin / palette author / DS reference",
   };
   ```
3. **Edit `tokens.css`.** Open the `[data-theme="<your-id>"] { … }` block and define **every required token**. The list lives in `app/themes/types.ts` (`ThemeTokenName`); the tokens-coverage test (`themes/__tests__/tokens-coverage.test.ts`) fails CI if any are missing. Reference an existing theme (`light`, `dark`, `tokyo-night`, …) to see the exhaustive set.
4. **Pick semantic-layer values.** Connectors consume `--label-{green,yellow,...}` and `--shadow-card`. Your theme remaps those — never edit the raw 42labs DS palette in `globals.css`. The semantic layer is what makes connector code theme-agnostic.
5. **Regenerate the registry.**
   ```bash
   pnpm gen:registries
   ```
   This rewrites `app/themes/index.ts` and re-imports your `tokens.css` from `app/themes/index.css`.
6. **Eyeball it.**
   ```bash
   pnpm dev
   ```
   Open `http://localhost:3000/settings`, switch to your theme, click through the bento grid + every tile type. Pay attention to:
   - Connector chips (Trello labels, calendar event color hints) — do they read in both quick scans and detail?
   - Drop targets during plugin drags (`--accent-soft` overlay) — visible against the surface?
   - Selected workspace icon in the Dock — readable contrast?
   - Card hover state, focus rings, error pills.
7. **Verify.** `pnpm typecheck && pnpm lint && pnpm test --run && pnpm gen:registries:check && pnpm build`.

## Token coverage

The contract is enforced by `app/themes/__tests__/tokens-coverage.test.ts`. Run it specifically:

```bash
pnpm test --run themes/__tests__/tokens-coverage.test.ts
```

The test reads each theme's `tokens.css` and compares against the required-tokens manifest. A missing token surfaces as `theme "<id>" missing token --foo`.

## Mode classification

`manifest.mode` declares the theme's brightness. The settings page groups themes by mode and the toggle in the Dock flips between the user's preferred light theme and preferred dark theme. Mismatched mode (a "light" theme using dark surface tokens) is a design bug, not enforced by code — eyeball it during the visual sweep.

## 10-minute checklist

- [ ] Copied `_template/`, renamed folder to your id
- [ ] `manifest.ts`: `id` matches folder, `label`/`mode`/`source` set
- [ ] `tokens.css`: `[data-theme="<id>"]` block defines every required token
- [ ] Visual sweep done in dev — chips, drop targets, Dock, card hover, error pills all readable
- [ ] `pnpm gen:registries` ran clean
- [ ] `pnpm test --run themes/__tests__/tokens-coverage.test.ts` green
- [ ] `pnpm typecheck && pnpm lint && pnpm test --run && pnpm gen:registries:check && pnpm build` green
- [ ] PR opened against `main`
