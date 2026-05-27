# Add a tile

A **tile** in LENS renders data inside the bento grid. Tiles are decoupled from connectors — a single-connector tile imports its connector's hooks directly, while a shared tile (`media-list`, `task-list`, `task-due`, `note-cards`, …) consumes data through `TileAdapter` instances registered on each compatible connector.

Read first: [`app/tiles/README.md`](../../app/tiles/README.md) — the full contract for `TileManifest`.

## What a tile folder looks like

```
app/tiles/<id>/
  manifest.ts            TileManifest export — id, label, default size, Component, topbar overrides
  component.tsx          the React component that renders the tile body
  __tests__/             optional vitest specs (rare for tiles — most logic lives in connectors)
```

## Step-by-step (single-connector tile)

1. **Copy the template.**
   ```bash
   cp -r app/tiles/_template app/tiles/<your-id>
   ```
2. **Edit `manifest.ts`.** Set `id` (kebab-case, matches folder name), `label`, `defaultSize` (W/H in grid cells), optional `recommendedSize`, `Component`, optional `topbarLabel(card)` and `topbarHref(card)`. If the topbar should render structured content, supply `TopbarContent`.
3. **Edit `component.tsx`.** Import the connector's hook(s) directly. Render against the tile's body using DS tokens — no inline color literals, no hardcoded sizes. Use the shared chrome helpers (`TileSkeleton`, `TileEmpty`, `TileUnconfigured`, `TileErrorPill`) from `app/tiles/_shared/`.
4. **Wire the connector.** In `app/connectors/<id>/manifest.tsx`, append your tile id to `tiles[]`. No `tileAdapters` entry needed for a single-connector tile.
5. **Run `pnpm gen:registries`** to regenerate the tile index.
6. **Verify.** `pnpm typecheck && pnpm lint && pnpm test --run && pnpm build`.

## Step-by-step (shared tile across multiple connectors)

A shared tile renders normalized data — for example, `media-list` accepts `MediaItem[]`. Each compatible connector supplies its own `TileAdapter` mapping its data into that normalized shape.

1. **Define the normalized shape** in `app/tiles/<id>/types.ts` (e.g. `MediaItem`, `TaskItem`).
2. **Create the tile component** that accepts the normalized data — render-only, no connector knowledge.
3. **For each compatible connector**, add a file under `app/connectors/<connector-id>/tiles/<tile-id>.tsx` that exports a `TileAdapter`:
   ```ts
   export const trelloTaskListAdapter: TileAdapter<TrelloConfig, TaskItem[]> = {
     useData(card) { return useTrelloTasks(card.config); },
     topbarLabel(card) { return card.config.listName ?? "Trello"; },
   };
   ```
4. **Register the adapter** on the connector's manifest:
   ```ts
   tileAdapters: { "task-list": trelloTaskListAdapter },
   ```
5. **List the tile** in the connector's `tiles[]` array.
6. **Regenerate + verify** as above.

## Sizing

`defaultSize` is `{ w, h }` in 20×20 grid cells. The `recommendedSize` field (optional) tells the universal panel to suggest a smaller-than-default size when the user picks the tile. When the user resizes via the panel, the new size is validated against the tile's manifest before saving.

## DS-token discipline

Visual styling routes through tokens defined in `app/globals.css`:

- Colors: `var(--accent)`, `var(--fg-muted)`, `var(--surface-alt)`, …
- Type scale: Tailwind classes `text-xxs`, `text-tiny`, `text-xs`, `text-sm`, `text-base`
- Spacing: `var(--sp-1)`, `var(--sp-2)`, …, `var(--sp-6)`

Use connector-color tokens (`--label-green`, `--label-blue`, …) for any hue that comes from upstream data — themes remap these. Raw 42labs DS tokens (`var(--copper)`) are reserved for Light/Dark themes.

## 10-minute checklist

- [ ] Copied `_template/`, renamed folder to your id
- [ ] `manifest.ts`: `id` matches folder, `label`/`defaultSize`/`Component` set
- [ ] `component.tsx` uses shared chrome helpers + DS tokens only
- [ ] Connector's `manifest.tsx` lists the new tile id in `tiles[]`
- [ ] (Shared tile only) Per-connector `TileAdapter` files written + registered in `tileAdapters`
- [ ] `pnpm gen:registries` ran clean
- [ ] `pnpm typecheck && pnpm lint && pnpm test --run && pnpm build` green
- [ ] PR opened against `main`
