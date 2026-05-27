# Connectors

Each connector is a **self-contained module** under `app/connectors/<id>/`. All integration-specific code (auth, data client, per-tile data adapters, config UI body, README) lives inside its own folder.

A connector's job is to **provide data**. Rendering happens in `app/tiles/` (see `app/tiles/README.md`); a connector declares which tiles it can feed via `ConnectorManifest.tiles[]` and, for shared (multi-connector) tiles, supplies an adapter under `tileAdapters[<tile-id>]`.

## Canonical layout

```
app/connectors/
  types.ts              ConnectorManifest + LayoutCard contracts
  index.ts              registry — getConnectors(), getConnector(id)
  README.md             this file
  _template/            reference template (excluded from registry — leading underscore)
  _shared/              cross-connector helpers (google-oauth, integration-error)
  <connector-id>/       a connector folder (must NOT start with `_`)
    manifest.tsx        single TypeScript export declaring the connector
    auth.ts             server-side auth helper, reads process.env.* only
    client.ts           source adapter (cached fetchers, normalized error envelope)
    types.ts            connector-internal types (e.g. NormalizedTrelloCard)
    hooks/              React-side data hooks — useThing(args)
    tiles/              per-(this connector × shared tile) adapters
      <tile-id>.tsx     TileAdapter — useData + topbar overrides
    config.tsx          connector-specific body that mounts inside the universal card-config panel
    _shared/            connector-internal helpers (states, utils)
    README.md           operator setup + required env vars + scopes
    __tests__/          vitest specs (client, utils)
```

## Manifest contract

See `types.ts`. Each connector exports a `ConnectorManifest<TConfig>` with:

| Field | Purpose |
|:------|:--------|
| `id` | Stable lowercase-kebab id (e.g. `google-calendar`). |
| `name` | Human-readable label. |
| `icon` | DS-tokenized lucide icon. |
| `description` | Shown in the connector picker. |
| `auth` | `{ envVars, setupDoc }` — operator-facing setup info. |
| `configSchema` | `z.ZodType<TConfig>` — validates the connector-specific portion of card config. |
| `defaultConfig` | `() => TConfig` returning a fresh default config object. |
| `tiles` | `string[]` of compatible tile ids. The picker filters `getTiles()` against this list. |
| `tileAdapters?` | `Record<tileId, TileAdapter>` for shared tiles only — required when this connector lists a tile whose component dispatches via the adapter registry. |
| `ConfigBody` | Component mounted inside the universal card-config panel. |

## Registry

`index.ts` exports `getConnectors()` and `getConnector(id)`. Manifests are registered via the explicit `manifests` array — Next.js 16 / Turbopack does not have stable build-time globbing, so we keep the array explicit. Folders prefixed with `_` (e.g. `_template/`) are not registered and are not imported at runtime.

## Tile adapters

A connector lists tile ids it wants to feed (`tiles: ["task-list", "kanban-board", "task-due"]`). Single-connector tiles (e.g. `kanban-board` for Trello) need no adapter — the tile's component imports the connector's hook directly. Shared tiles (e.g. `task-list` is used by both Trello and Google Tasks) require the connector to register a `TileAdapter` keyed by the tile's id:

```ts
// connectors/<id>/tiles/<tile-id>.tsx
import type { TileAdapter } from "@/tiles/types";
import type { TaskListData } from "@/tiles/task-list/types";

export const taskListAdapter: TileAdapter<MyConfig, TaskListData> = {
  useData(card) {
    const { data, isLoading, error } = useMyHook(args);
    return {
      data: data?.map((row) => ({ /* normalized TaskItem */ })),
      isLoading,
      error,
    };
  },
  topbarLabel: (card) => card.config.someName?.toUpperCase(),
  topbarHref:  (card) => maybeUrl(card.config),
};
```

The shared tile component dispatches via `getTileAdapter(card)` (re-exported from `@/tiles`), calls `adapter.useData(card)`, then renders. Adding a new connector to an existing shared tile is: write an adapter file, list the tile id in `tiles[]`, register the adapter in `tileAdapters`. **Zero edits to the tile.**

The normalized data shape is owned by each shared tile under `app/tiles/<tile-id>/types.ts` — that's the contract every contributing connector must satisfy.

## Adding a new connector

See the full cookbook with checklist: [`docs/contrib/add-a-connector.md`](../../docs/contrib/add-a-connector.md). Short version:

1. Copy `_template/` to `<your-connector-id>/`.
2. Implement `auth.ts`, `client.ts`, `manifest.tsx`, `config.tsx`. Pick the tile ids you want to feed and add them to `manifest.tiles[]`.
3. For each shared tile in your `tiles[]`, write an adapter under `<your-connector-id>/tiles/<tile-id>.tsx` and register it in `manifest.tileAdapters`.
4. Add API route handlers under `<your-connector-id>/api/<route>/route.ts`.
5. Run `pnpm gen:registries` — the codegen rewrites `connectors/index.ts` and emits the URL-stable shims under `app/api/<id>/`.
6. Document required env vars + scopes in your connector's `README.md`.

## Connector patterns

There are four shapes a connector can take. The manifest contract is identical across all of them — only `auth.ts`, `client.ts`, and the data hook differ.

| Pattern              | Auth                | `auth.ts`                                                          | `client.ts`                                          | Data hook                                                   | Examples                                         |
|:---------------------|:--------------------|:-------------------------------------------------------------------|:-----------------------------------------------------|:------------------------------------------------------------|:--------------------------------------------------|
| External + OAuth     | refresh token       | Reads env vars, exchanges refresh → access token                   | Server-only HTTP client to upstream API              | `useThing(args)` over React Query → `/api/<connector>/*`    | google-calendar, google-sheets, google-tasks      |
| External + API key   | static key + token  | Reads env vars, signs each request                                 | Server-only HTTP client to upstream API              | `useThing(args)` over React Query → `/api/<connector>/*`    | trello, trakt                                    |
| External + auth-free | none                | **No-op stub** — `{ envVars: [], setupDoc: 'N/A — public data' }`  | Server-only HTTP client to upstream API              | `useThing(args)` over React Query → `/api/<connector>/*`    | goodreads                                        |
| Local                | n/a                 | **No-op stub** — `{ envVars: [], setupDoc: 'N/A — local data' }`   | Client-only persistence facade (localStorage / DB)   | `useThing()` over `useSyncExternalStore` → facade           | scratchpad                                       |

All four patterns coexist in the same registry. The layout system never inspects which pattern a connector follows.

### External + auth-free notes

- The `auth.ts` stub mirrors the local-connector stub for canonical-layout symmetry — every connector folder still has the file even when no auth is required.
- Privacy-induced failure (e.g. Goodreads serves 404 on a private profile) is mapped to `IntegrationError("auth", ...)` at the source-adapter boundary. The renderer's error pill says "private — set profile to public", not "sign-in expired". The error envelope is uniform; the UI copy is connector-specific.
- The connector still proxies through `app/api/<connector>/*` — the auth-free public URL is fetched server-side, not from the browser. This keeps the source's IP-rate-limiting behavior consistent regardless of who is viewing the dashboard, and keeps response sanitization (HTML strip, parse-failure fallback) in one place.

### Local-connector notes

The local connector lives in the *same* registry — manifests look identical from the layout system's perspective. Only the implementation under `client.ts` and `auth.ts` differs. When Supabase lands, the same connector switches `client.ts` from a localStorage facade to a Supabase facade with no consumer-side change.

**Single-writer rule:** local connectors must guarantee a single writer per item type to avoid inconsistent state. For scratchpad, only the cross-card deselect path (b02-05) and the gear-panel debug action mutate the buffer.

## Per-tile size constraints

Tile size constraints (`recommendedSize`, `defaultSize`) live on the tile manifest under `app/tiles/<id>/manifest.ts`, not on the connector. The layout system enforces them at card creation, drag-resize, and config-panel level. Sizes are in 20×20 grid units (see `<GridSurface>`).
