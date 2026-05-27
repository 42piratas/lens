# Goodreads connector

Read-only per-shelf book lists from a public Goodreads profile via the per-shelf RSS endpoint. **Auth-free** — Goodreads's official API was shut down to new keys in December 2020; the per-shelf RSS feed is the only stable read path. The user's numeric Goodreads ID and the shelf name are the only configuration.

This is the third connector pattern in the codebase: **external + auth-free**.

## Required env vars

None.

## One-time operator setup

1. **Set your Goodreads profile to public.**

   The RSS feed only serves shelves of accounts whose profile visibility is set to **"Anyone (including people who aren't logged in to Goodreads)"**.

   Path: **Account settings → Profile → Who can view my profile → Anyone**.

   If your profile is restricted, the connector renders a "Goodreads shelf is private" pill until you flip the setting back to public.

2. **Find your numeric Goodreads user ID.**

   Open your Goodreads profile in a browser. The URL looks like:

   ```
   https://www.goodreads.com/user/show/12345678-firstname-lastname
   ```

   The number between `/show/` and the first `-` is your user ID (in this example, `12345678`). Paste it into the connector config panel.

3. **Pick a shelf.**

   Goodreads always provides three built-in shelves: `currently-reading`, `read`, `to-read`. Any user-defined shelves also work — use the lowercase / hyphenated slug (the form Goodreads displays in shelf URLs).

## Tile compatibility

This connector feeds **one tile**: `media-list` (shared with Trakt). The tile is rendered by `app/tiles/media-list/component.tsx`; this connector contributes data via the adapter at `connectors/goodreads/tiles/media-list.tsx`.

### Display variants (per-card config)

`media-list` supports four display variants. Picked per card via the Display segmented control in the config panel:

| Variant | Cover | Title | Subtitle (author) |
|:--|:--|:--|:--|
| `title` | small (44px) | ✓ | — |
| `title-subtitle` | medium (56px) | ✓ | ✓ |
| `full` (default) | large (64px) | ✓ | ✓ |
| `cover` | full-width | — | — |

## Module layout

```
connectors/goodreads/
├─ manifest.tsx              # registry entry — tiles: ["media-list"], tileAdapters
├─ auth.ts                   # no-op stub for canonical-layout symmetry
├─ client.ts                 # server-only listShelfBooks (60s cache, RSS parser, HTML strip)
├─ types.ts                  # GoodreadsBook, ShelfData, IntegrationError re-exports
├─ config.tsx                # ConfigBody — userId + shelfName + limit + display variant
├─ hooks/
│  └─ use-shelf.ts           # @tanstack/react-query wrapper for /api/goodreads/shelf
├─ tiles/
│  └─ media-list.tsx         # TileAdapter — maps GoodreadsBook[] → MediaItem[]
├─ _shared/
│  ├─ states.tsx             # GoodreadsSkeleton, GoodreadsErrorPill, GoodreadsUnconfigured, GoodreadsEmpty
│  └─ utils.ts               # isValidUserId, isValidShelf, isValidLimit, shelfTitleCase
└─ __tests__/                # client + utils
```

The single route handler at `app/api/goodreads/shelf/route.ts` wraps `listShelfBooks` so the client-side hook never touches the server-only module directly.

## Limits

- 60-second in-memory cache on `listShelfBooks`, keyed by `(userId, shelfName, limit)`.
- HTML in description fields is stripped server-side at the single sanitization point in `client.ts`. Renderers receive plain strings.
- Goodreads RSS only serves the **public** view. The connector intentionally does not authenticate — there is no token, scope, or session.
- The `IntegrationError` envelope reuses the `auth` kind for "data inaccessible due to source-side privacy" (private profile). The other kinds (`rate-limit`, `network`, `unknown`) keep their literal meanings.

## Why RSS

The Goodreads developer API stopped issuing new keys in December 2020. Existing keys still work for some legacy integrations, but the API as a whole is on a deprecation path. RSS feeds remain the only stable read surface — they don't require a key, work for any public account, and have not changed shape in years.

If Goodreads ever revives a public API, this connector can swap `client.ts` to that new transport without touching the manifest or the tile adapter.
