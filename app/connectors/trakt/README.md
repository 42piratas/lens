# Trakt connector

Public Trakt user lists (movies + TV) — feeds the shared `media-list` tile alongside Goodreads.

## Why Trakt (not IMDB)

The original ask was an IMDB-list connector. Every IMDB-native path is dead or ToS-violating: RSS feeds were removed ~2023, anonymous CSV `/export` was removed 2024-06-27, the official AWS Data Exchange API exposes no user-list endpoints, and any HTML/internal-GraphQL/RapidAPI route violates IMDB's TOS. Trakt is the substitute — a real public API with free read access, native movies+TV lists, and a documented IMDB→Trakt CSV import.

## Operator setup

1. Create a free Trakt account if you don't have one.
2. Open <https://trakt.tv/oauth/applications> and click **New Application**.
   - Name: anything (e.g. `LENS`).
   - Redirect URI: `urn:ietf:wg:oauth:2.0:oob` (read-only API-key auth doesn't use the redirect, but the field is required).
   - Permissions / scopes: leave defaults — read-only is sufficient for v1.
3. Copy the **Client ID** into `app/.env.local`:

   ```
   TRAKT_CLIENT_ID=<your client id>
   ```

   The Client Secret is **not** needed — public-list reads only require the Client ID, sent as the `trakt-api-key` header. Private-list reads require user OAuth and land with multi-user auth (b02-06).
4. Restart the dev server.

## Finding the list slug

Trakt list URLs look like `https://trakt.tv/users/<username>/lists/<slug>`. Both fields go in the connector's config panel:

- **Username** — your Trakt username (lowercase letters, digits, `_`, `-`).
- **List slug** — the slug from the list URL (lowercase letters, digits, `-`).

The list must be **public** in v1. Set visibility on the list page itself (Trakt → list → Edit → Privacy → Public).

## Importing IMDB lists

Trakt has a documented IMDB CSV importer at <https://trakt.tv/lists/import>. Export your IMDB list as CSV, upload, pick a target Trakt list. Once imported, the list lives at `trakt.tv/users/<your-username>/lists/<imported-slug>` and is reachable from this connector.

## Tile compatibility

This connector feeds **one tile**: `media-list` (shared with Goodreads). The tile is rendered by `app/tiles/media-list/component.tsx`; this connector contributes data via the adapter at `connectors/trakt/tiles/media-list.tsx`.

The same Display variants apply: `title` / `title-subtitle` / `full` / `cover` (default `full`). Trakt items map to `MediaItem` as `{ title, subtitle: year, imageUrl: posterUrl, href: link }`.

## Module layout

| File | Purpose |
|:-----|:--------|
| `manifest.tsx` | Connector declaration — `tiles: ["media-list"]` + adapter registration |
| `auth.ts` | `{ envVars: ['TRAKT_CLIENT_ID'], setupDoc }` |
| `client.ts` | Server-only Trakt HTTP client + 60s in-memory cache |
| `types.ts` | `TraktListItem`, `TraktListMeta`, error re-exports |
| `config.tsx` | Universal-panel body — username + slug + limit + display variant |
| `tiles/media-list.tsx` | TileAdapter — maps `TraktListItem[]` → `MediaItem[]` |
| `hooks/use-trakt-list.ts` | TanStack Query hook over `/api/trakt/list` |
| `hooks/use-config-name-sync.ts` | Render-time `listName` denormalization (called from inside the adapter) |
| `_shared/states.tsx` | Skeleton, error pill, unconfigured, empty |
| `_shared/utils.ts` | `traktTopbarLabel`, validators |
| `__tests__/` | Vitest unit tests (client + utils) |

## Posters

Trakt's `?extended=images` query parameter returns CDN poster URLs (`media.trakt.tv/images/...`) free-tier, with no TMDB dependency. The client requests `extended=images` on every list-items fetch and the adapter surfaces the first `images.poster` entry as the row's `imageUrl`. When Trakt has no poster on file the tile falls back to the shared gradient cover.

## What v1 does NOT do

- **Private lists.** Require user OAuth — folded into multi-user auth (b02-06).
- **Watchlist / collection modes.** Trakt has dedicated `/users/{username}/watchlist` + `/users/{username}/collection` endpoints; future tiles or future adapter modes.

## Error envelope

Same `IntegrationError` shape as the other external connectors:

| HTTP | Kind | Renderer copy |
|:-----|:-----|:--------------|
| 401 / 403 | `auth` | "Trakt rejected the API key — check `TRAKT_CLIENT_ID`" |
| 404 | `auth` | "List is private or not found — v1 supports public lists only" |
| 429 | `rate-limit` | "List unavailable" |
| 5xx | `network` | "List unavailable" |
| parse failure | `unknown` | "List unavailable" |

The `auth` kind is repurposed for "data inaccessible due to source-side privacy" per the convention introduced in b02-04-03 (Goodreads).

## Rate limit

Trakt enforces 1000 GETs per 5 minutes per `client_id` on the free tier (~3.3 req/s sustained). The 60s in-memory cache absorbs most of the load — a single card refetches every 60s, well under the cap even with all connectors active.
