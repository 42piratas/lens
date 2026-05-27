# Tiles

A **tile** is a layout/template module under `app/tiles/<tile-id>/`. Tiles render content; connectors provide the data. One tile can be compatible with N connectors; one connector can support N tiles.

Tile ids are functional and provider-agnostic, prefix-grouped:

| Group | Tiles |
|:--|:--|
| `calendar-` | `calendar-one-day`, `calendar-one-week`, `calendar-one-month`, `calendar-many-weeks` |
| `task-` | `task-list`, `task-due` |
| `kanban-` | `kanban-board` |
| `note-` | `note-cards`, `note-buffer` |
| `media-` | `media-list` |
| `data-` | `data-stat`, `data-table`, `data-chart-line` |
| `badges-` | `badges-with-descriptions` |

**14 tiles** today.

## Canonical layout

```
app/tiles/
  types.ts                  TileManifest + TileAdapter contracts
  index.ts                  registry — getTile / getTiles / getTilesForConnector / getTileAdapter
  README.md                 this file
  _shared/
    states.tsx              TileSkeleton / TileEmpty / TileUnconfigured / TileErrorPill
  _template/                reference template (excluded from registry — leading underscore)
  <tile-id>/                a tile folder (must NOT start with `_`)
    types.ts                normalized data type for shared tiles (e.g. MediaItem[])
    component.tsx           React renderer (receives the LayoutCard)
    manifest.ts             tile manifest entry (TileManifest)
```

## Manifest contract

See `types.ts`. Each tile exports a `TileManifest<TConfig>`:

| Field | Purpose |
|:------|:--------|
| `id` | Stable lowercase-kebab id, globally unique. |
| `label` | Human-readable label shown in the tile picker. |
| `defaultSize` | `{ w, h }` in 20×20 grid units. |
| `recommendedSize?` | Optional smaller hint — used by the picker label. |
| `description?` | Optional. |
| `Component` | Renderer; receives `{ card: LayoutCard<TConfig> }`. |
| `topbarLabel?` / `TopbarContent?` / `topbarHref?` | Optional dynamic top-bar overrides. For shared tiles, these typically dispatch to the connector's adapter (`(card) => getTileAdapter(card)?.topbarLabel?.(card)`) so each connector can supply its own label/href. |

## Single-connector vs shared tiles

There are two flavors of tile, and the registration shape differs.

**Single-connector** — the tile is logically owned by one connector (e.g. `kanban-board` is Trello-only, `data-stat` is Sheets-only, `calendar-many-weeks` is Calendar-only). The component imports the owning connector's hooks directly. The connector lists the tile id in `tiles[]` and that's it — no `tileAdapters` entry needed.

**Shared (multi-connector)** — the tile is data-agnostic and consumes a normalized data shape. Examples: `media-list` (goodreads + trakt), `task-list` (google-tasks + trello), `task-due` (google-tasks + trello), `note-cards` (keep). The tile defines its own normalized type under `types.ts` (e.g. `MediaItem[]`) and the component dispatches via `getTileAdapter(card)` to read the data. Each compatible connector registers a `TileAdapter` in `ConnectorManifest.tileAdapters[<tile-id>]` that maps its raw data into the tile's normalized shape.

## Adapter contract

```ts
// tiles/types.ts
export type TileAdapter<TConfig, TData> = {
  useData(card: LayoutCard<TConfig>): {
    data: TData | undefined;
    isLoading: boolean;
    error: unknown;
  };
  topbarLabel?(card: LayoutCard<TConfig>): string | undefined;
  topbarHref?(card: LayoutCard<TConfig>): string | undefined;
};
```

The `useData` function calls React hooks, so the adapter file is a `"use client"` module. It returns:
- `data: undefined` + `isLoading: false` → tile renders `TileUnconfigured`
- `isLoading: true` → tile renders `TileSkeleton`
- `error` truthy → tile renders `TileErrorPill`
- `data: []` → tile renders `TileEmpty`
- `data: [...]` → tile renders the items

## Registry

`index.ts` exports:
- `getTiles()` — all registered manifests
- `getTile(id)` — one manifest by id
- `getTilesForConnector(compatibleIds)` — picker filter helper
- `getTileAdapter(card)` — resolves the adapter for a card's `(connector, tile)` pair, or `undefined`

Manifests are registered via the explicit `manifests` array. Folders prefixed with `_` are excluded.

## Adding a new tile

See the full cookbook with checklist: [`docs/contrib/add-a-tile.md`](../../docs/contrib/add-a-tile.md). Short version:

1. Copy `_template/` to `<your-tile-id>/`.
2. Decide single-connector or shared:
   - **Single-connector**: in `component.tsx`, import the owning connector's hooks directly. No adapter needed.
   - **Shared**: in `types.ts`, define the normalized data type. In `component.tsx`, call `getTileAdapter(card)` and render based on its result. Each compatible connector must register a `TileAdapter` in its manifest.
3. Implement `manifest.ts` — set `id`, `label`, `defaultSize`, `Component`. For shared tiles, wire `topbarLabel` / `topbarHref` to dispatch through `getTileAdapter`.
4. Run `pnpm gen:registries` to regenerate `tiles/index.ts`.
5. Add the tile id to each compatible connector's `ConnectorManifest.tiles: string[]`. For shared tiles, also register the adapter in `tileAdapters`.

## Theme tokens for charts

Chart-style tiles use semantic palette tokens defined in `app/globals.css`:

- `--chart-1` … `--chart-6` — categorical series colors
- `--chart-grid` — grid line color
- `--chart-axis` — axis label color

Defaults map to the OKR palette (copper / emerald / blue / violet) plus two extras. Themes can override these tokens to reskin every chart tile without touching tile components.

## Schema migration

Layout state (`localStorage['lens.layout']`) tracks `LayoutCard.tile`. When tile ids are renamed (e.g. `goodreads-shelf` → `media-list`), the migration map lives in `lib/layout/store.ts` (`TILE_ID_RENAMES`) and runs once on read. Existing user layouts auto-update without losing cards.
