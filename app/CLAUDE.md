@AGENTS.md

# LENS — app/

Next.js application for LENS, a personal PMS dashboard. Fixed **20×20 viewport-fit** grid of generic tiles. Each card is a `(connector, tile)` pair: connectors provide data, tiles render it. Tile types are folder-modular under `app/tiles/`; connectors are folder-modular under `app/connectors/`. Phase 2 ships Google Calendar, Sheets, Tasks, Keep, Trello, Scratchpad, Goodreads, Trakt, and GitHub as connectors and 17 tile types (`calendar-*`, `task-*`, `kanban-board`, `note-*`, `media-list`, `data-*`, `badges-with-descriptions`, `gh-*`). Keep is read-only and Workspace-gated via a service account + domain-wide delegation; the picker hides it for users outside the configured Workspace (b02-12). OKR connectors land later.

This file is the technical spec for the app subdir.

## Tech Stack

| Component | Technology | Status |
|-----------|-----------|:--|
| Framework | Next.js 16 (App Router, **no `src/`** dir) | ✅ Phase 1 |
| Language | TypeScript strict | ✅ |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"` + `@theme`) | ✅ |
| Fonts | IBM Plex Sans 300 · Space Grotesk · Geist Mono via `next/font/google` | ✅ |
| Validation | Zod (card / layout schemas) | ✅ |
| State (UI) | Zustand (theme store) | ✅ |
| Icons | lucide-react | ✅ |
| Components | shadcn/ui (deferred to Phase 2+) | ⏳ |
| Drag and drop | @dnd-kit/core + custom push-on-collide reflow (`lib/layout/reflow.ts`) | ✅ b02-01-03 |
| Plugins (cross-tile drag-payload registry + retry queue) | `lib/dnd-payloads/` | ✅ b02-05 |
| Data fetching | TanStack Query | ✅ b02-01 |
| Google Calendar | dev-mode OAuth (single-user refresh token) | ✅ b02-01 |
| Backend/DB | Supabase (Postgres + Vault token encryption) | ✅ b02-15 |
| Auth | next-auth v5 (Google OAuth + Trello fragment-token) | ✅ b02-15 |
| AI | LiteLLM proxy (Railway) — chat assistant | ⏳ Phase 2 |
| Hosting | Vercel **or** Railway (decision deferred) | ⏳ |
| Testing | Vitest (node env) | ✅ b02-01 |

## Branching + Deployment

Two-gate workflow. App repo default branch is `staging`. Feature PRs target `staging`; promotion to `main` is a separate manual PR. `pr-base-guard` CI job blocks non-`staging` / non-`hotfix/*` PRs to `main`. Auto-merge is **never armed**.

## Project Structure

```
lens/                    ← repo root
├── .nvmrc
├── docs/                    ← playbooks
├── infra/                   ← LiteLLM (Phase 2)
├── .github/workflows/       ← ci.yml, pr-base-guard.yml
└── app/                     ← Next.js subdir (pnpm install runs here)
    ├── CLAUDE.md            ← this file
    ├── AGENTS.md
    ├── commitlint.config.js
    ├── eslint.config.mjs
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── postcss.config.mjs
    ├── pnpm-workspace.yaml
    ├── auth.ts              ← Auth.js v5 config: providers, adapter, callbacks (b02-15)
    ├── auth.d.ts            ← module augmentation for next-auth Session (b02-15)
    ├── middleware.ts        ← Edge auth gate (redirects pages, 401-JSON for /api/*) (b02-15)
    ├── app/                 ← App Router
    │   ├── globals.css      ← 42labs DS tokens (light + dark) + bento overrides + overlay keyframes
    │   ├── layout.tsx       ← root layout: fonts, FOUC bootstrap, QueryProvider, Dock shell + Pinboard (b02-11), AddCardPanel + modal slot, FloatingChat, SessionProvider, SyncBridges (workspace + scratchpad — b02-15; pinboard — b02-11)
    │   ├── page.tsx         ← GridSurface (root grid; no /dashboard prefix)
    │   ├── icon.png         ← 42labs skull (favicon)
    │   ├── apple-icon.png
    │   ├── api/                       ← URL surface only — connector route handlers live under `connectors/<id>/api/`; everything below shimmed by `pnpm gen:registries` (b02-08)
    │   │   ├── auth/[...nextauth]/    ← Auth.js route handler (b02-15) [non-shim]
    │   │   ├── auth/connections/      ← GET (providers list, no token plaintext) + DELETE (b02-15) [non-shim]
    │   │   ├── auth/trello/{start,store}/ ← Trello fragment-token flow (b02-15) [non-shim]
    │   │   ├── local/layout/          ← GET / PUT singleton workspaces; POST = first-sign-in migration (b02-15) [non-shim]
    │   │   ├── local/scratchpad/      ← GET / PUT singleton; POST = first-sign-in migration (b02-15) [non-shim]
    │   │   ├── local/pending-writes/{,drain/} ← server-side queue + drain (b02-15) [non-shim]
    │   │   ├── goodreads/shelf/   ← shim → connectors/goodreads/api/shelf
    │   │   ├── google/calendar/   ← shims → connectors/google-calendar/api/{calendars,events}
    │   │   ├── google/sheets/     ← shims → connectors/google-sheets/api/{range,cell,metadata}
    │   │   ├── google/tasks/      ← shims → connectors/google-tasks/api/{tasklists,list,due}
    │   │   ├── keep/              ← shims → connectors/keep/api/{notes,labels} (b02-12 — Workspace-gated)
    │   │   ├── trakt/             ← shim → connectors/trakt/api/list
    │   │   └── trello/            ← shims → connectors/trello/api/{boards,cards,labels,lists,cards/[cardId]}
    │   ├── (auth)/                ← sign-in route group (own layout, no shell). Splash backdrop forces `data-theme="dark"`; drifting "+" pattern bg
    │   │   ├── layout.tsx          ← `auth-backdrop` wrapper, imports `auth.css`
    │   │   ├── auth.css            ← backdrop tokens (mapped to LENS DS) + drifting "+" pattern animation
    │   │   └── sign-in/            ← splash login (adapted from `~/42labs/42agents/commons/splash-login/`)
    │   │       ├── page.tsx        ← server: auth check, redirect, passes Google action to client component
    │   │       ├── SplashLogin.tsx ← client: 3-stage window entrance, decode-text reveal, OAuth wiring
    │   │       ├── login.css       ← window entrance + form styles
    │   │       └── logo.ts         ← `<splash-logo>` web component (animated copper gradient)
    │   ├── trello-callback/       ← reads #token=…, POSTs to /api/auth/trello/store (b02-15)
    │   ├── c/[cardId]/page.tsx        ← maximized full-page (hard-nav target)
    │   ├── @modal/
    │   │   ├── default.tsx            ← null when no card open
    │   │   └── (.)c/[cardId]/page.tsx ← intercepted overlay (soft-nav)
    │   └── settings/
    │       ├── page.tsx               ← sectioned editor (b02-10)
    │       ├── SettingsSection.tsx    ← shared tile-chrome wrapper (uses `.lens-card-chrome` so settings render like dashboard tiles)
    │       └── sections/ConnectionsSection.tsx ← Connect/Reconnect/Disconnect per provider (b02-15)
    ├── components/
    │   ├── shell/           ← Dock (`Dock.tsx`), Pinboard (`Pinboard.tsx` + `PinDialog.tsx` + `PinIcon.tsx`, b02-11), ThemeToggle, EscBackHandler, FloatingChat, ConditionalShell (b02-15), UserMenu (b02-15), SessionProvider (b02-15)
    │   ├── grid/            ← GridSurface (DnD wrapper), CardChrome, GhostPreview, CardOverlay, MaximizedCardClient
    │   └── panel/           ← AddCardPanel (universal add/edit), ConnectorPicker, ModePicker, SizePicker
    ├── connectors/          ← canonical connector folder — provides DATA
    │   ├── types.ts         ← ConnectorManifest (incl. tiles[] + tileAdapters + optional `enabled?: () => boolean` runtime gate), LayoutCard ({connector, tile, x, y, w, h, config})
    │   ├── index.ts         ← AUTO-GENERATED registry (b02-08); `pnpm gen:registries` regenerates — getConnectors(), getConnector(id)
    │   ├── README.md        ← contract docs + how-to-add
    │   ├── _template/       ← reference template (excluded from registry)
    │   ├── _shared/         ← cross-connector helpers — google-oauth.ts, integration-error.ts
    │   ├── github/          ← GitHub App (read-only, per-repo, b02-13) — manifest, auth, client (GraphQL prs/issues + REST notifications), types, hooks/use-github-{prs,issues,notifications}, _shared/{states,utils}, api/{prs,issues,notifications}, config, README. Connect flow lives at app/api/auth/github/{start,callback}; user-to-server token in oauth_tokens (provider "github"). Three single-connector tiles (gh-*).
    │   ├── goodreads/       ← auth-free RSS — manifest, hooks/use-shelf, tiles/media-list (adapter), api/shelf (b02-08), config, README
    │   ├── google-calendar/ ← OAuth — manifest, dates, hooks/{calendars,events,colors}, _shared/{states,utils}, payload-adapters/{tag-like,clip-like,note-like}, api/{calendars,events} (b02-08), config, README
    │   ├── google-sheets/   ← OAuth — manifest, hooks/{range,cell,metadata}, tiles/{data-chart-line,badges-with-descriptions} (adapters), api/{range,cell,metadata} (b02-08), config, README
    │   ├── google-tasks/    ← OAuth — manifest, hooks/{tasklists,tasks-list,tasks-due}, tiles/{task-list,task-due} (adapters), api/{tasklists,list,due} (b02-08), config, README
    │   ├── keep/            ← Service-account + DWD (read-only, Workspace-gated, b02-12) — manifest, hooks/use-notes, tiles/note-cards (adapter), api/{notes,labels}, config, README. Uses `lib/auth/google-keep-sa.ts` to mint user-impersonated access tokens via the SA configured for the org; picker hides Keep when `session.user.hd !== NEXT_PUBLIC_LENS_KEEP_WORKSPACE_DOMAIN`.
    │   ├── scratchpad/      ← local — manifest, client (localStorage), config, README; SyncBridge (b02-15 — bidirectional server↔client sync) + sync.ts
    │   ├── trakt/           ← API-key — manifest, client, hooks/{trakt-list,config-name-sync}, tiles/media-list (adapter), api/list (b02-08), config, README
    │   └── trello/          ← API-key+token — manifest, hooks/{boards,lists,cards}, _shared/card-item, tiles/{task-list,task-due}, payload-adapters/{tag-like,clip-like,note-like}, api/{boards,cards,labels,lists,cards/[cardId]} (b02-08, +b02-09 cards/[cardId] PUT gains `descAppend` branch with server-side idempotency), config, README
    ├── themes/              ← canonical theme folder — REGISTRY of palettes
    │   ├── types.ts          ← ThemeManifest (modes: light · dark · dark-paper)
    │   ├── index.ts          ← AUTO-GENERATED registry (b02-08); `pnpm gen:registries` regenerates — getThemes(), getTheme(id)
    │   ├── index.css         ← AUTO-GENERATED `@import` aggregator for every theme's tokens.css (b02-08)
    │   ├── _paper-pattern.css ← shared structural CSS for every `mode: "dark-paper"` theme (chrome-cascade, multi-card body, inner-card lift, header-fg, sidebar-icon, media-merge); fires via `<html data-theme-mode="dark-paper">`
    │   ├── README.md         ← contract + add-a-theme flow + paper-on-dark cookbook
    │   ├── _template/        ← reference template
    │   ├── light/            ← default — 42labs DS canvas-warm + copper
    │   ├── dark/             ← default — 42labs DS void + mint
    │   ├── dark-paper/       ← paper-on-dark variant of `dark` (steel paper on void)
    │   ├── solarized-dark/   ← mirrored — Solarized canonical dark
    │   ├── solarized-dark-paper/ ← paper-on-dark variant — base3 paper on base03
    │   ├── dracula/          ← mirrored — pink/purple on plum
    │   ├── dracula-paper/    ← paper-on-dark variant — Foreground paper on Background
    │   ├── nord/             ← mirrored — Frost over Polar Night
    │   ├── nord-paper/       ← paper-on-dark variant — Snow Storm paper on Polar Night
    │   ├── rose-pine/        ← mirrored — Main (dark)
    │   ├── rose-pine-paper/  ← paper-on-dark variant — Dawn paper on Main
    │   ├── monokai/          ← mirrored — canonical Monokai pink/green
    │   ├── monokai-paper/    ← paper-on-dark variant — Monokai Light paper on canonical Monokai
    │   ├── tokyo-night/      ← mirrored — Storm variant blue
    │   └── catppuccin-mocha/ ← mirrored — mauve over warm dark
    │   /* Other mirrored themes (catppuccin-latte, tokyo-night-day, rose-pine-dawn, gruvbox-{light,dark}, one-{light,dark-pro}, monokai-light, github-light, ayu-light) shipped via b02-07 — omitted from tree for brevity */
    ├── tiles/               ← canonical tile folder — RENDERS
    │   ├── types.ts         ← TileManifest, TileAdapter
    │   ├── index.ts         ← AUTO-GENERATED registry (b02-08); `pnpm gen:registries` regenerates — getTiles(), getTile(id), getTilesForConnector(ids), getTileAdapter(card)
    │   ├── README.md        ← contract docs + single-connector vs shared
    │   ├── _template/       ← reference template
    │   ├── _shared/         ← TileSkeleton, TileEmpty, TileUnconfigured, TileErrorPill (used by shared tiles)
    │   ├── calendar-{one-day,one-week,one-month,many-weeks}/ ← single-connector — Calendar
    │   ├── data-{stat,table,chart-line}/                     ← Sheets — chart uses visx + theme-tokenized palette
    │   ├── gh-{pr-list,issue-list,notification-list}/        ← single-connector — GitHub (b02-13); CI-status dots map to --label-{green,red,yellow,gray}
    │   ├── kanban-board/                                     ← single-connector — Trello
    │   ├── note-{cards,buffer}/                              ← cards = Keep; buffer = Scratchpad
    │   ├── media-list/                                       ← shared (Goodreads + Trakt) — 4 display variants
    │   ├── task-{list,due}/                                  ← shared (Google Tasks + Trello)
    │   └── badges-with-descriptions/                         ← Sheets — chip + description rows
    ├── lib/
    │   ├── auth/            ← b02-15 — supabase-jwt (HS256 mint), persist-oauth-tokens (vault round-trip), mirror-user, route-wrapper (authedRoute + withUser AsyncLocalStorage), session, user-context, pending-writes-worker
    │   ├── supabase/        ← b02-15 — admin (service-role client, next_auth schema), server (per-request JWT-bound client), vault (RPC wrappers — vault_create/update/read/delete_secret)
    │   ├── theme/           ← bootstrap script + Zustand store
    │   ├── layout/          ← Zustand layout store (proxies to workspace), schema (v2), placement (first-fit), reflow (push-on-collide), TILE_ID_RENAMES legacy migration
    │   ├── workspace/       ← Zustand workspace store + schema (v1) + curated icon set; persists `lens.workspaces`; layout/theme stores route through it; SyncBridge (b02-15 — bidirectional server↔client sync) + sync.ts
    │   ├── pinboard/        ← b02-11 — Zustand pin store + schema (v1: `Pin = { id, label, url, icon, order }`); persists `lens.pinboard` (global, not per-workspace); SyncBridge mirrors the workspace pattern; sync.ts
    │   ├── dnd-payloads/    ← b02-05 — DragPayload union + Zod, emit/parseDragPayload, getPayloadAdapter, drag-context store, pending-writes retry queue
    │   ├── panel/           ← AddCardPanel UI store (open/edit/draft state)
    │   ├── chat/            ← FloatingChat open/close store (Dock-triggered)
    │   ├── grid/            ← grid-visibility store + geometry helpers (GRID_DIM=20, MIN/MAX viewport)
    │   ├── hooks/           ← cross-connector React hooks — use-scratchpad.ts (useSyncExternalStore over scratchpad/client.ts)
    │   ├── prefs/           ← global UI prefs (font scale + Dock position) — Zustand store + FOUC bootstrap; persists `lens.prefs.*`
    │   └── providers/       ← QueryProvider (TanStack Query)
    ├── scripts/
    │   ├── gen-registries.ts        ← b02-08 — regenerates connector/tile/theme indexes + API shims; `pnpm gen:registries` (write) / `gen:registries:check` (CI gate)
    │   ├── check-orphan-registries.ts ← b02-08 — audits hand-maintained registries (workspace icons, payload kinds); `pnpm lint:check` runs both
    │   ├── google-oauth.mjs        ← dev-mode OAuth refresh-token issuer (run once per env)
    │   ├── probe-auth-schema.mjs   ← b02-15 — verifies next_auth.users reachable via service-role
    │   ├── probe-oauth-state.mjs   ← b02-15 — inspects oauth_tokens row state for a user
    │   ├── probe-vault-rpc.mjs     ← b02-15 — round-trips vault encrypt/decrypt via RPC wrappers
    │   └── probe-rls-cross-user.mjs ← b02-15 — empirical 2-account RLS probe (forge-INSERT, cross-read)
    ├── public/
    └── supabase/migrations/
        ├── 0001_init_auth.sql      ← b02-15 — schema (next_auth.* + public.users/oauth_tokens/layouts/scratchpad/pending_writes), RLS policies, vault_create/update wrappers
        ├── 0002_vault_read_rpc.sql ← b02-15 — vault_read_secret + vault_delete_secret SECURITY DEFINER wrappers (vault schema not exposed to PostgREST)
        ├── 0003_pinboards.sql      ← b02-11 — public.pinboards (singleton per user, jsonb state envelope) + owner-only RLS + service-role grant
        └── 0004_github_oauth_provider.sql ← b02-13 — widen oauth_tokens provider CHECK to include 'github' (no new columns/policies; inherits the b02-15 oauth_tokens RLS)
```

## Tile model

> **Terminology.** A **tile** is the top-level grid unit (one slot in the 20×20 bento, with topbar + body). A **card** is a sub-row of content *inside* a tile (e.g. Trello cards inside a `kanban-board` or `task-list` tile). Type and CSS class names still use "card" (`LayoutCard`, `lens-card-chrome`, `lens-card-body`) as legacy identifiers from the b02-01 era; conceptual usage in prose / comments / new code follows tile-vs-card.

A dashboard slot is a `(connector, tile, config)` triple. Connectors live in `app/connectors/`; tiles live in `app/tiles/`. The two registries are decoupled: a tile renders, a connector provides data. Single-connector tiles import their connector's hook directly. Shared tiles (used by 2+ connectors) consume normalized data via `TileAdapter` instances registered on each compatible connector.

Canonical contracts:

- `LayoutCard<TConfig>` (in `app/connectors/types.ts`) — `{ id, connector, tile, x, y, w, h, config }`. Persisted under `localStorage['lens.layout']`.
- `ConnectorManifest<TConfig>` (in `app/connectors/types.ts`) — `{ id, name, icon, description, auth, configSchema, defaultConfig, tiles: string[], tileAdapters?: Record<tileId, TileAdapter>, payloadAdapters?, enabled?: () => boolean, ConfigBody }`. `tiles[]` lists which tile ids this connector can feed; `tileAdapters` registers per-shared-tile adapters; `enabled?` (b02-08) is a runtime gate filtered at registry-build time for env-flag deferred connectors. Per-user gates (e.g. Keep's Workspace gate, b02-12) sit at the picker layer instead — `AddCardPanel` reads `session.user.hd` and filters Keep out for non-Workspace users.
- `TileManifest<TConfig>` (in `app/tiles/types.ts`) — `{ id, label, defaultSize, recommendedSize?, description?, Component, topbarLabel?(card), TopbarContent?, topbarHref?(card) }`. Owns presentation; stored in `app/tiles/<id>/manifest.ts`.
- `TileAdapter<TConfig, TData>` (in `app/tiles/types.ts`) — `{ useData(card), topbarLabel?(card), topbarHref?(card) }`. Per-(connector × shared-tile) adapter that maps connector data into the tile's normalized shape (`MediaItem[]`, `TaskItem[]`, etc.).

Registries are codegen-managed (b02-08 — `pnpm gen:registries` reads disk and writes `app/{connectors,tiles,themes}/index.ts` + `app/themes/index.css` + every `app/api/<id>/.../route.ts` shim). The codegen validates: every non-`_*` folder under each surface contains its `manifest.{ts,tsx}` (and `tokens.css` for themes), and the manifest's `id` literal matches the folder name. CI gates: `pnpm gen:registries:check` (drift) + `pnpm lint:check` (orphan registries — workspace quick-pick icons against lucide, payload-kind parity between `types.ts` ↔ `schema.ts`). Folders prefixed with `_` are excluded.

Helpers:

- `getConnector(id)` / `getConnectors()` from `@/connectors`
- `getTile(id)` / `getTiles()` / `getTilesForConnector(compatIds)` / `getTileAdapter(card)` from `@/tiles`

`CardChrome` reads `getTile(card.tile)` and `getConnector(card.connector)`. For shared tiles, the tile manifest's `topbarLabel` / `topbarHref` typically dispatch to `getTileAdapter(card)?.topbarLabel?.(card)` so each connector can supply its own label without the tile knowing about specific connectors.

The 14 tile types are documented in `app/tiles/README.md`. Connector-side conventions are documented in `app/connectors/README.md`.

## Plugins (cross-tile drag-payload registry — b02-05)

The 5th modular surface. Connectors / tiles / themes / workspaces cover *what data shows up where*; plugins cover *how data crosses tile boundaries* — drag a producer (e.g. a Sheets `badges-with-descriptions` row), drop on a foreign connector's tile, the foreign connector absorbs the payload into its native model.

Canonical contracts:

- `DragPayload` (in `lib/dnd-payloads/types.ts`) — discriminated union keyed by `kind`. Three kinds ship: `tag-like` (`{ name, description?, color?, source? }`), `clip-like` (`{ label, source, originalContent, parentTitle?, href?, meta? }`), and `note-like` (`{ title?, body, source? }`, b02-09). The HTML5 MIME-of-record is `application/x-lens-payload`.
- `PayloadAdapter<TConfig, P>` (in `connectors/types.ts`) — `{ label, rowLabel?, canAccept(card, payload), canAcceptTarget?(card, payload, target), onAccept(card, payload, target?), onContentEdited?(card, payload, target?), invalidateOnAccept?(card, target?) }`. `onAccept` covers absorption entry points (drop, click-emit, programmatic) so the same contract serves drag-and-drop and click-to-bind without rename. `canAcceptTarget` gates per-row drops (e.g. specific Trello card, specific Calendar event); adapters that require a target reject tile-background drops with a friendly reason. `invalidateOnAccept` returns query-key prefixes the worker invalidates after success so the affected tile refetches without a manual reload. `onContentEdited` is the SOURCE-side write-back hook (b02-06): when the bound textarea blurs, the source connector PUTs / PATCHes the upstream resource (Trello card desc, Calendar event description).
- `ConnectorManifest.payloadAdapters?: Partial<Record<DragPayloadKind, PayloadAdapter>>` — connectors opt in by listing their adapters under the kind they accept.

Helpers in `lib/dnd-payloads/`:

- `emitPayload(transfer, payload)` / `parseDragPayload(transfer)` — DataTransfer (de)serialization with Zod validation.
- `getPayloadAdapter(card, kind)` — per-card adapter resolver, used by drop targets at render time.
- `useDragContext()` — Zustand store of the in-flight drag (`{ kind, payload }`) since browsers block `getData(...)` reads during dragover. Producers call `beginDrag(payload)` on `dragstart` + `endDrag()` on `dragend`.
- `pending-writes.ts` — optimistic-write retry queue (`localStorage["lens.payload_pending_write"]`); worker drains with backoff `1s → 5s → 30s → 5m`. Permanent 401s register an inline reconnect pill on the affected card chrome (`subscribeToFailures` / `retryFailureForCard`). Wired on boot via `<PluginWorkerBootstrap />` in `app/layout.tsx`.
- `note-envelope.ts` (b02-09) — shared envelope helper for `note-like` description-style writes. `noteEnvelope(payload)` formats the optional title + body (no footer); `alreadyContainsEnvelope(existing, payload)` is the trailing-suffix check used for re-drop idempotency.

UI:

- `components/grid/PluginRowDropTarget.tsx` wraps each row in compatible tiles (Trello kanban + task-list + task-due rows; calendar timed events + all-day chips across `calendar-one-day` / `one-week` / `many-weeks`). Renders as a pass-through when no compatible payload is in flight; otherwise emits drag handlers + a `data-over` outline routed through a single shared `useDragContext.overTarget` zustand state (only one row highlights at a time across the whole app — solves the dragenter/dragleave race between flex-row siblings).
- `components/grid/CardChrome.tsx` renders the tile body directly and mounts the inline reconnect pill (visible only on permanent failures).

Adapter registry:

| Connector | Kind | Behavior |
|:--|:--|:--|
| `trello` | `tag-like` | `ensureBoardLabel` (reuse-by-name on the card's board, idempotent) → `applyLabelToCard(target.id, labelId)`. Label color: deterministic name-hash into Trello's 10-color palette so the same badge always picks the same hue. Per-row only — tile-background drops are rejected. |
| `google-calendar` | `tag-like` | PATCHes the targeted event's description with a `[name] description` (or `[name]`) prefix, idempotent (skip if prefix already present). Event `colorId` is intentionally not modified — Calendar event colors carry user meaning. Multi-calendar tiles thread `target.meta.calendarId` so the patch hits the event's real calendar. Applied tags surface client-side as accent chips on the event row, parsed from leading `[name]` paragraphs. |
| `scratchpad` | `clip-like` | Absorber — replaces the single binding (`setBinding`) with the producer's source identity + `originalContent`. |
| `trello` | `clip-like` | Round-trip ONLY (canAccept=false; `onContentEdited` PUTs the new content to `/api/trello/cards/{cardId}` as `desc`). |
| `google-calendar` | `clip-like` | Round-trip ONLY (canAccept=false; `onContentEdited` PATCHes `/api/google/calendar/events` with `description`). Reads `calendarId` from `payload.meta.calendarId`. |
| `trello` | `note-like` | Per-card. PUTs `/api/trello/cards/<id>` with `descAppend = noteEnvelope(payload)`; the route GETs the current desc and idempotently appends the envelope (server-side suffix check, skip if already trailing). Per-row only. |
| `google-calendar` | `note-like` | Per-event. `descriptionAppend` branch in `/api/google/calendar/events` PATCH reads existing description, idempotently appends the envelope (server-side suffix check). Requires `target.meta.calendarId`. |

Auto-refresh: `<PluginWorkerBootstrap>` resolves the app's `QueryClient` via `useQueryClient()` and, on a successful `onAccept`, invokes the adapter's `invalidateOnAccept` (Trello: `["trello","cards"]`, Calendar: `["google","events"]`) so the affected tile refetches and the new label / chip appears without a manual reload. The Trello `cardsCache` and Calendar `eventsCache` server-side TTLs were dropped — descriptions and labels are user-editable in the source apps and a stale TTL would mask external edits; React Query's client-side `staleTime` provides the de-dup we actually want.

### Note-drop flow (`note-like` — b02-09)

`note-like` is the third payload kind. It moves **text content** (a body and optional title) from the **free-form scratchpad** onto a target connector's row, appending it to the row's description.

1. **Producer** — the scratchpad editor (`tiles/note-buffer/component.tsx`) is always editable. When **unbound** and the draft is non-empty, a small `GripVertical` drag handle appears at the top-right of the textarea. `dragstart` calls `emitPayload(transfer, { kind: "note-like", body: draft, source: { connector: "scratchpad", sourceId: "free" } })` and `useDragContext.beginDrag(payload)`. When **bound** (via b02-06 click-to-bind round-trip), the drag handle is hidden — re-attaching bound text via drag would conflict with the source-of-truth round-trip semantics.
2. **Drop targets** — per-row / per-event `<PluginRowDropTarget>` already mounted by b02-06 (`kanban-board` cards, `calendar-one-day` + `calendar-one-week` events) accept the new payload via the new connector adapters. `calendar-one-month` + `calendar-many-weeks` are out of scope (event hit-areas too dense).
3. **Adapter dispatch** — `PluginRowDropTarget` resolves the adapter and `enqueueWrite` queues an `accept` write. Single behavior across all targets: **append to description**. No mode picker — Trello and Calendar use the same description-append shape. (Keep is read-only since b02-12; it ships no payload adapter.)
4. **Server-side idempotency** — `/api/trello/cards/<id>` PUT (`descAppend` branch) and `/api/google/calendar/events` PATCH (`descriptionAppend` branch) both GET the existing content and skip the write when the appended block already trails the description. The envelope itself (`noteEnvelope`) carries no footer marker — the body content is the suffix-match key.
5. **Failure surfacing** — same primitive as `tag-like` / `clip-like`: permanent 401s register the inline reconnect pill on the affected card chrome.

### Selection-binding flow (`clip-like` — b02-06)

`clip-like` is the second payload kind. The scratchpad holds **one** active binding at a time: clicking a producer row replaces the binding and loads the source's body into the editable note. On blur, the new content is written back to the source through the connector's adapter.

1. **Producer** — every opted-in row is a button. Click → `useClips().toggleClip(payload)` (`lib/dnd-payloads/use-clips.ts`). The payload carries `originalContent` (the editable body) + `parentTitle` (Trello list / "CALENDAR" / etc.) + optional `meta` for connector routing (Calendar: `{ calendarId }`).
2. **Absorber** — `useClips` calls the scratchpad client's `setBinding(...)` directly: `localStorage["lens.scratchpad"]` schema v2 is `{ version: 2, binding: BoundSource | null, content: string }`. Setting a binding seeds `content` from `originalContent`.
3. **Toggle** — re-clicking the same source row clears the binding (`clearBinding()`).
4. **Edit + write-back** — the `note-buffer` tile renders a textarea bound to `state.content`. `onChange` updates a local draft; `onBlur` calls `updateContent(draft)` then enqueues `{ kind: "clip-edit", payload }` against any live card whose connector matches the binding. The retry-queue executor invokes the source connector's `payloadAdapters["clip-like"].onContentEdited` — Trello PUTs the card desc, Calendar PATCHes the event description.
5. **Read-only sources** — Sheets / Tasks / Goodreads / Trakt omit `onContentEdited`. The note-buffer renders the textarea as `readonly` and shows a "Read-only — this source cannot be written from here" banner.
6. **Title bar** — the tile's `TopbarContent` shows `<parentTitle> | <sourceTitle>` while bound (e.g. `NOOOW! | LENS`, `CALENDAR | Standup`), or `Scratchpad` when unbound.
7. **Failure surfacing** — same primitive as `tag-like`: permanent 401s on the write-back register the inline reconnect pill on the affected card chrome.

Visual: the bound producer row carries `data-clipped="true"` on its wrapper. The DS tokens `--clipped-bg` and `--clipped-border` (defined in `globals.css`) inherit the active theme's accent.

Required write scopes (b02-05 onward):

- Trello token: `read,write` (re-issue at `trello.com/power-ups/admin` → revoke + new authorize URL with `scope=read,write`).
- Google Calendar refresh token: `calendar.readonly` + `calendar.events`. `scripts/google-oauth.mjs` defaults updated; re-issue once. Read-only setups can pass `--scopes=...` to keep the legacy scope set.
- Google Keep: read-only via service account + domain-wide delegation (b02-12) — Workspace admin grants the SA `https://www.googleapis.com/auth/keep.readonly`; LENS impersonates the signed-in user via the SA JSON key. No user-OAuth path (Keep is not in Google's user-OAuth scopes catalog).

## Workspaces

Workspaces are saved snapshots of the entire dashboard state — layout + theme — owned by `lib/workspace/store.ts`. One LENS install holds N workspaces; the operator switches between them via the Dock switcher (icons between two dividers). Switching is atomic: layout + theme swap together with a single click.

Schema in `lib/workspace/schema.ts`:

```ts
type Workspace = {
  id: string; name: string; icon: string; // lucide icon name
  createdAt: number; updatedAt: number;
  theme: string;        // theme id from app/themes registry
  layout: LayoutCard[];
};

type WorkspacesState = { version: 1; activeId: string; workspaces: Workspace[] };
```

Persisted to `localStorage["lens.workspaces"]`. On first boot the store auto-migrates legacy `lens.layout` (v2) into a single `Default` workspace and removes the old key. The legacy `lens.theme` value becomes that workspace's `theme`. Per-mode theme preferences (`lens.theme.light`, `lens.theme.dark`) stay global — they encode the user's preferred light/dark themes, not workspace state.

**Layout store** (`lib/layout/store.ts`) and **theme store** (`lib/theme/store.ts`) now route through the workspace store. CRUD ops on layout call `useWorkspaceStore.getState().setActiveLayout(next)`; theme `setTheme(id)` calls `setActiveTheme(id)`. Both stores subscribe to workspace switches and re-mirror on activeId swap.

**Dock layout:**

```
[skull] [user-avatar] | divider | [ws-1] [ws-2] ... [+] | divider | [plus] [grid] [help] [settings] [theme-toggle] [chat]
```

Workspace interactions:
- Click a workspace icon → switch active (layout + theme swap atomically)
- Right-click a workspace → context menu (rename, change icon, duplicate, delete)
- Click `+` → create dialog (name + icon picker; the icon picker exposes a curated 32-icon `lucide-react` subset — extend in `lib/workspace/icons.ts`)
- The last workspace can't be deleted (the store refuses)

The workspace system was b02-07 sub-scope C. Theme modularization (sub-scope A) and tile modularization (sub-scope B) are the parallel modularization tracks.

## Layout state

Layout state lives in `lib/layout/store.ts` (Zustand). Schema in `lib/layout/schema.ts`:

```ts
type LayoutState = { version: 2; cards: LayoutCard[] };
```

- Persistence is workspace-routed: every CRUD op writes through `useWorkspaceStore.setActiveLayout(next)`, which persists to `localStorage["lens.workspaces"][activeIdx].layout`. The layout store no longer touches `localStorage["lens.layout"]` directly — that key only exists during the one-time migration to the workspaces envelope.
- On boot: layout store calls `useWorkspaceStore.hydrate()`, then mirrors the active workspace's layout into its own `cards` array. It subscribes to workspace-store changes so workspace switches re-mirror automatically.
- Legacy tile-id migration: cards persisted under the pre-consolidation tile ids (`goodreads-shelf`, `google-tasks-list`, etc.) auto-rewrite to the new functional ids on read via `migrateTileIds()` in `lib/layout/store.ts`. The renamer runs every hydrate (cheap and idempotent); persisted layouts keep their original ids until the next write, at which point the migrated form is saved.
- Drive-JSON persistence deferred to b02-06 (Auth).
- Placement (`lib/layout/placement.ts`): `findFirstAvailableSlot(cards, w, h, excludeId?)` scans left-to-right, top-to-bottom for the first empty W×H rectangle — feeds add-card Save and full-grid error.
- Reflow (`lib/layout/reflow.ts`): `reflowAfterMove(cards, id, newX, newY)` cascades displacement on drag drop using BFS from the moved card. Returns `{ ok: false }` when a displaced card has nowhere to land — caller drops the move.

## Tile lifecycle

- **Add**: Dock plus or center plus → `AddCardPanel` opens (right-docked aside, grid stays visible). Connector → tile → size → ConfigBody. Tile change keeps current size if it satisfies the new tile's `defaultSize`, else resets. Size-out-of-range renders inline error and disables Save. Save validates against universal schema + manifest's `configSchema`, places via first-fit, persists, closes. Center plus visible only when `cards.length === 0` AND panel is closed.
- **Edit**: hover a tile → gear icon (top-right) → click opens the same panel pre-populated. Same tile-change rule. Connector change requires confirm dialog (config discarded). Resize is panel config, not free-drag handle.
- **Drag**: `@dnd-kit/core` `useDraggable` on the tile topbar (drag handle area only; gear, title link, and body remain interactive). Drop → cell snap → push-on-collide reflow → persist.
- **Delete**: panel footer button (bottom-left, ghost) → confirm dialog → remove + persist.

## Drag library choice

`@dnd-kit/core` + custom reflow (`lib/layout/reflow.ts`) — chosen over react-grid-layout because the latter (v2.2.x) calls `findDOMNode` which is removed in React 19. dnd-kit handles drag transforms; the reflow algorithm runs on drop and replaces the layout cards with the cascaded result.

Chat is **not** a card — it lives in `components/shell/FloatingChat.tsx` (ported from `hiresling.ai/PublicChat`). Open/close state in `lib/chat/store.ts` (Zustand). Trigger is the `MessageCircle` button in the Dock (last item, after the theme toggle); the chat panel itself still renders bottom-right when open. The panel hides whenever the AddCardPanel is open.

## Maximize routing

Soft-nav overlay via parallel routes + intercepting routes. URL `/c/[cardId]`:

- Soft-nav from `/` → `@modal/(.)c/[cardId]/page.tsx` renders `CardOverlay` over the bento (backdrop blur + scale-fade keyframes in `globals.css`).
- Hard refresh on the same URL → `c/[cardId]/page.tsx` renders the full-page version (via `MaximizedCardClient`, which reads card config from the layout store).
- Esc / X / backdrop click closes via `router.back()`.

The literal `c/` prefix is required because Next.js's `(.)` interceptor doesn't bind to bare dynamic segments like `(.)[cardId]` — it parses the parens as part of a literal folder name.

OKR cards route through the same `/c/[cardId]` path as every other card type since b02-01 (the dedicated `/okrs` page was removed).

## Theme

Themes are folder-modular under `app/themes/<id>/` (canonical-layout sibling of `connectors/` and `tiles/`). Each theme is a `manifest.ts` (`ThemeManifest`) + `tokens.css` (`[data-theme="<id>"]` selector defining every required token). The registry at `app/themes/index.ts` exports `getThemes()` / `getTheme(id)`; the CSS aggregator `app/themes/index.css` `@import`s each theme's tokens.css. `globals.css` imports the aggregator once.

**Selection mechanism is `<html data-theme="<id>">`.** Never `body.theme-dark`. Inline `THEME_BOOTSTRAP_SCRIPT` runs in `<head>` to apply the active theme before paint (no FOUC).

**Theme store (`lib/theme/store.ts`)** tracks three values:

- `theme` — currently active theme id
- `lightThemeId` — preferred light-mode pick (default `"light"`)
- `darkThemeId` — preferred dark-mode pick (default `"dark"`)

`setTheme(id)` updates `theme` AND the per-mode preference (so picking Tokyo Night sets `darkThemeId = "tokyo-night"`). `toggle()` flips between `lightThemeId` ↔ `darkThemeId`. The future settings page lets the user set the two preferences explicitly without having to "visit" each one. Persisted under `lens.theme`, `lens.theme.light`, `lens.theme.dark`.

**Dock** ships one theme affordance: `ThemeToggle` (binary mode flip). Theme picking moved to `/settings` (b02-10) — the page is the single surface for choosing per-mode preferences.

**Connector CSS rules go through the semantic layer.** No connector references raw 42labs DS tokens (`var(--copper)`, `var(--emerald)`) directly. Instead they consume `--label-{green,yellow,orange,red,purple,blue,sky,lime,pink,black,gray}` (Trello / Keep / generic chip colors) and `--shadow-card` (depth that inverts on dark surfaces). Each theme remaps these tokens; raw 42labs DS tokens stay constant in `globals.css` as the platform brand canvas (Light/Dark themes still reference them; named themes define their own raw values inline).

**v1 bundles 26 themes (10 light + 10 dark + 6 dark-paper variants).** Defaults are `light` / `dark` (42labs DS — labelled "42labs Light" / "42labs Dark"). Mirrored: Catppuccin (Latte/Mocha), Solarized (Light/Dark), Tokyo Night (Day/Storm), Rosé Pine (Dawn/Main), Gruvbox (Light/Dark), One (Light/Dark Pro), Monokai (Light/Dark), GitHub Light, Ayu Light, Nord, Dracula. Paper-on-dark variants (`mode: "dark-paper"`): 42labs Dark Paper, Solarized Dark Paper, Dracula Paper, Rosé Pine Paper, Nord Paper, Monokai Paper — all use the shared `_paper-pattern.css` framework (paper-layer tokens only per theme; structural rules shared). Adding a theme: copy `_template/`, fill all required tokens, register in `index.ts` + `index.css`. The tokens-coverage test (`themes/__tests__/tokens-coverage.test.ts`) fails CI when any theme is incomplete (incl. the 10 paper-layer tokens for `dark-paper` themes).

The theme system was b02-07 sub-scope A. Workspaces (sub-scope C) is the parallel modularization track.

## Design System compliance (enforced)

All visual styling routes through 42labs DS tokens. **Hardcoded literals are forbidden** for visual properties:

- Color literals (`#ef4444`, `rgb(...)`, `rgba(...)`, `hsl(...)`) — use a token (`var(--accent)`, `text-(--fg-muted)`, `bg-(--surface-alt)`).
- Hardcoded `fontSize` in `style` props or arbitrary `text-[Npx]` Tailwind classes — use the type scale (`text-xxs`, `text-tiny`, `text-xs`, `text-sm`, `text-base`).
- Hardcoded `padding`/`margin` px in `style` props — use the spacing scale (`var(--sp-*)`) or Tailwind spacing classes.

ESLint rule (`no-restricted-syntax`, see `eslint.config.mjs`) enforces (1)–(3) on the `style` prop. Violations fail `pnpm lint`.

**Permitted exceptions:**
- `style={{...}}` for **dynamic / computed** values that can't be tokenized: grid coordinates (`gridRow`, `gridColumn`), animation transforms, JS-derived px positions. The exception applies to *what can't be expressed in tokens*, not to convenience.
- Token-referencing inline styles such as `style={{ color: "var(--fg-muted)" }}` are permitted but discouraged. Prefer dedicated class form (`.lens-cal-*`, `.tile-label`, `.meta-mono`) — see `app/connectors/google-calendar/` for the canonical pattern. The legacy grandfather note for `components/cards/calendar/` and pre-port maximize routes is closed: b02-01-04 ported the calendar in full, deleted the parked renderers, and pushed every visual style into `globals.css` classes.

**External-data colors** (e.g. Google Calendar event color from API) are not literals — they are runtime values and may flow into `style` directly.

Source of truth for the DS: `https://42labs.io/design`. All semantic tokens are defined in `app/globals.css` under `:root` (light) and `[data-theme="dark"]` (dark).

## Development

```bash
cd lens/app
pnpm install
pnpm dev                       # localhost:3000
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm gen:registries            # b02-08 — regenerate connector/tile/theme indexes + API shims
pnpm gen:registries:check      # b02-08 — CI gate: fails if registries are out of sync with disk
pnpm lint:check                # b02-08 — gen:registries:check + orphan-registry audit (workspace icons, payload kinds)
```

## Routes

| Route | Status | Notes |
|:--|:--|:--|
| `/` | ✅ | Fixed 20×20 GridSurface; layout from Zustand store (default empty, persisted to `localStorage['lens.layout']`) |
| `/c/[cardId]` | ✅ | Maximized card overlay (soft-nav) / full page (hard-nav) |
| `/settings` | ✅ b02-10 | Sectioned editor: theme (per-mode), font scale, Dock position, workspaces, grid (read-only), import/export, plugins (placeholder for b02-05) |
| `/sign-in` | ✅ b02-15 | Google sign-in surface; redirects authed users to / |
| `/trello-callback` | ✅ b02-15 | Reads Trello fragment-token, posts to /api/auth/trello/store |
| `/api/auth/[...nextauth]` | ✅ b02-15 | next-auth (Google provider, JWT strategy) |
| `/api/auth/trello/start` | ✅ b02-15 | Redirects to Trello's authorize URL with fragment-token return |
| `/api/auth/trello/store` | ✅ b02-15 | Validates token via /1/members/me, persists to oauth_tokens |
| `/api/auth/connections` | ✅ b02-15 | GET = connected providers (no token plaintext); DELETE = disconnect |
| `/api/local/layout` | ✅ b02-15 | GET / PUT singleton workspaces envelope; POST = first-sign-in idempotent migration |
| `/api/local/scratchpad` | ✅ b02-15 | Same shape as /api/local/layout for the scratchpad envelope |
| `/api/local/pending-writes` | ✅ b02-15 | GET / POST / DELETE — replaces b02-05 localStorage queue |
| `/api/local/pending-writes/drain` | ✅ b02-15 | POST — server-side worker that processes ready items with backoff |
| `/api/local/pinboard` | ✅ b02-11 | GET / PUT singleton pinboard envelope; POST = first-sign-in idempotent migration |
| `/api/pinboard/favicon` | ✅ b02-11 | GET `?url=` — server-side favicon proxy, 24h cache + Google s2 fallback; structured JSON error on miss |
| `/api/google/calendar/calendars` | ✅ b02-01 | Lists user's Google Calendars (server-side OAuth proxy) |
| `/api/google/calendar/events` | ✅ b02-01 | Lists events for `(calendarId, timeMin, timeMax)` |
| `/api/google/sheets/range` | ✅ b02-03 | Returns A1 range as `{ values, majorDimension: 'ROWS' }` |
| `/api/google/sheets/cell` | ✅ b02-03 | Convenience wrapper — single-cell value |
| `/api/google/sheets/metadata` | ✅ | Returns `{ sheets: [{ id, title }] }` for a spreadsheet — used to resolve sheet name → gid for topbar links |
| `/api/google/tasks/tasklists` | ✅ b02-04-02 | Lists user's tasklists (used by config picker) |
| `/api/google/tasks/list` | ✅ b02-04-02 | Lists tasks for `(tasklistId, showCompleted, showHidden)` |
| `/api/google/tasks/due` | ✅ b02-04-02 | Cross-list aggregate within `lookaheadDays` window, sorted by due asc |
| `/api/trello/{boards,lists,cards}` | ✅ b02-02 | Server-side Trello proxy (key + token in `.env.local`) |
| `/api/trello/labels` | ✅ b02-05 | GET (list) + POST (ensure idempotent) — backs the `tag-like` payload adapter |
| `/api/trello/cards/[cardId]` (PUT) | ✅ b02-09 | Update `desc` (clip-like) or `descAppend` (note-like — server-side GET-existing + suffix-skip + PUT, idempotent) |
| `/api/google/calendar/events` (PATCH) | ✅ b02-05 | Update event description: `descriptionPrefix` (tag-like, b02-05) · direct `description` (clip-like, b02-06) · `descriptionAppend` (note-like, b02-09 — server-side idempotent suffix check); event `colorId` intentionally untouched |
| `/api/goodreads/shelf` | ✅ b02-04-03 | Server-side Goodreads RSS proxy — auth-free; takes `userId`, `shelfName`, `limit` |
| `/api/trakt/list` | ✅ b02-04-04 | Server-side Trakt API proxy — public lists; takes `username`, `slug`, optional `limit` 1–50, optional `metaOnly=1` for the topbar denormalization fetch |
| `/api/keep/notes` | ✅ b02-12 | Lists Workspace user's notes (recent or `?label=…`). Wrapped with `authedRoute`; calls Keep REST API v1. |
| `/api/keep/labels` | ✅ b02-12 | Harvests distinct label names from the user's recent notes (Keep v1 has no labels endpoint). |
| `/api/auth/github/start` | ✅ b02-13 | Sets CSRF `state` cookie; redirects to the GitHub App install+authorize URL (`apps/<slug>/installations/new`). |
| `/api/auth/github/callback` | ✅ b02-13 | Verifies `state`; exchanges `code` for a user-to-server token (server-side, App client secret); persists to oauth_tokens (provider `github`); redirects to /settings. |
| `/api/github/prs` | ✅ b02-13 | `authedRoute` GET — PR-act-on queue via GraphQL search + CI-status rollup; 60s cache. |
| `/api/github/issues` | ✅ b02-13 | `authedRoute` GET — issues per repo (GraphQL repository node) or org (search); 404→not-found pill for un-installed repos. |
| `/api/github/notifications` | ✅ b02-13 | `authedRoute` GET — notifications inbox via REST (`GET /notifications`); GraphQL has no inbox. |
| `/api/local/{okrs,weight,scratchpad,layout,macro-tracks}` | ⏳ Phase 2 | Supabase-backed local CRUD |

## Google Calendar (dev-mode OAuth)

Operator setup, env-var schema, and module layout live in **`connectors/google-calendar/README.md`**. Quick recap:

- Three env vars in `.env.local`: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_CALENDAR_REFRESH_TOKEN`. Run `node scripts/google-oauth.mjs` once to issue the refresh token (default scope set: Calendar + Sheets + Tasks readonly). Multi-user sign-in lands in b02-06.
- Tokens never reach the client. Server caches access tokens (`expires_in − 60s` TTL) in **`connectors/_shared/google-oauth.ts`** — shared by Calendar + Sheets + Tasks, no duplication. The connector source adapter (`client.ts`) caches calendar payloads for 60s.
- Cards talk to the server only via the two route handlers under `app/api/google/calendar/`. Hooks (`connectors/google-calendar/hooks/use-calendars.ts`, `use-calendar-events.ts`) wrap them with `@tanstack/react-query`.
- Feeds 4 single-connector tiles: `calendar-one-day` / `calendar-one-week` / `calendar-one-month` / `calendar-many-weeks`. Tile components import the connector's hooks directly (no adapter — the tile is calendar-specific).
- Config UI: universal panel `gear` → calendar dropdown + per-tile options → Save persists to `localStorage['lens.layout']`.

## Google Sheets (shared OAuth refresh token)

Operator setup, env-var schema, and module layout live in **`connectors/google-sheets/README.md`**. Quick recap:

- Reuses the Google OAuth client from Calendar (no new client). Shares `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` / `GOOGLE_CALENDAR_REFRESH_TOKEN` env vars — the refresh-token name is shared by design through Phase 2; b02-06 (multi-user auth) replaces env-var tokens entirely.
- Required Google scope: `https://www.googleapis.com/auth/spreadsheets.readonly`. The OAuth helper script accepts `--scope=<url>` / `--scopes=a,b,c`; defaults to Calendar + Sheets + Tasks readonly so one re-issue covers all three.
- **No `listSpreadsheets` in v1** (minimum-scope policy — Drive scope deliberately excluded). Operator pastes a free-text spreadsheet ID; helper text shows where to find it in a Sheets URL.
- Server adapter exposes `getRange({ spreadsheetId, range })` and `getCell({ spreadsheetId, cell })`; same `IntegrationError` envelope as Calendar / Trello; 60s in-memory cache keyed by `(spreadsheetId, range)`.
- Cards talk to the server only via the route handlers under `app/api/google/sheets/`. Hooks (`use-range`, `use-cell`, `use-sheet-metadata`) wrap them with `@tanstack/react-query`.
- **`valueRenderOption=FORMATTED_VALUE`** — date/currency-formatted cells return as their displayed strings, not raw serial integers. Numeric coercion happens downstream (`coerceY` in the chart adapter, `formatCell` in the table component).
- Feeds 4 tiles: `data-table` and `data-stat` (single-connector, direct hook imports) plus `data-chart-line` and `badges-with-descriptions` (shared-tile shape, registered via `tileAdapters`).
- Config UI: universal panel `gear` → spreadsheet ID + per-tile A1 input (range or cell) + optional label + `treatFirstRowAsHeader` (range tiles) + `reverseRows` (range tiles, for newest-at-top sources). Changing the spreadsheet ID on blur clears the range/cell input — switching spreadsheets invalidates the prior reference.

## Google Tasks (shared OAuth refresh token)

Operator setup, env-var schema, and module layout live in **`connectors/google-tasks/README.md`**. Quick recap:

- Reuses the Google OAuth client + `GOOGLE_CALENDAR_REFRESH_TOKEN` env var with Calendar + Sheets — one refresh token covers all three Google scopes.
- Required Google scope: `https://www.googleapis.com/auth/tasks.readonly`. Default `scripts/google-oauth.mjs` invocation requests Calendar + Sheets + Tasks together.
- Server adapter exposes `listTasklists()` and `listTasks({ tasklistId, showCompleted?, showHidden?, dueMin?, dueMax? })`; same `IntegrationError` envelope as Calendar / Sheets / Trello; 60s in-memory cache keyed by `(tasklistId, showCompleted, showHidden, dueMin, dueMax)`.
- Cross-list aggregate (`task-due`) lives behind `listTasksAcrossAll({ showHidden?, dueMin, dueMax })` — fans out per tasklist, filters to tasks with `due`, sorts ascending, denormalizes tasklist title for the per-row caption.
- Cards talk to the server only via the three route handlers under `app/api/google/tasks/`. Hooks (`use-tasklists`, `use-tasks-list`, `use-tasks-due`) wrap them with `@tanstack/react-query`.
- Feeds two shared tiles: `task-list` (with Trello) + `task-due` (with Trello), registered via `tileAdapters`. Adapter at `connectors/google-tasks/tiles/{task-list,task-due}.tsx`.
- Config UI: universal panel `gear` → tasklist picker (`task-list`) + per-tile options (`task-list` → showCompleted toggle · `task-due` → lookaheadDays slider 1–60) + showHidden toggle (both). Tile-change rule: switching to `task-due` clears the tasklistId; switching back blanks it for the operator to re-pick.

## Trello (single-user API key + token)

Operator setup, env-var schema, and module layout live in **`connectors/trello/README.md`**. Quick recap:

- Two env vars in `.env.local`: `TRELLO_API_KEY`, `TRELLO_API_TOKEN`. Generate at <https://trello.com/power-ups/admin> with `read,write` scope (b02-05 onward — needed for label drops). Multi-user sign-in lands in b02-15.
- Tokens never reach the client. Server appends `key` + `token` to every Trello API call inside `connectors/trello/auth.ts`; the source adapter (`client.ts`) caches `boards`, `lists`, and `cards` payloads for 60s.
- Cards talk to the server only via the three route handlers under `app/api/trello/`. Hooks (`use-boards`, `use-lists`, `use-cards`) wrap them with `@tanstack/react-query`.
- Trello label colors (10 named hues) are mapped to the 42labs DS palette in `globals.css` (`.lens-trello-label--{color}` classes); raw Trello hex never enters the DOM.
- Feeds 3 tiles: `task-list` + `task-due` (shared with Google Tasks, registered via `tileAdapters`) + `kanban-board` (single-connector, Trello-specific layout). Adapters at `connectors/trello/tiles/{task-list,task-due}.tsx`.
- Config UI: universal panel `gear` → board dropdown (mandatory) → per-tile options (`task-list` → list dropdown · `kanban-board` → multi-select list filter · `task-due` → window slider 1–60 days). Changing the board clears the tile-specific selection and triggers re-fetch.

## GitHub (GitHub App — read-only, per-repo, b02-13)

Operator setup, permission list, and module layout live in **`connectors/github/README.md`**. Quick recap:

- **Second external identity** after Google. Connects as a post-sign-in **connection** (not a sign-in provider), implemented as a **GitHub App** installation + **user-to-server** authorization — *not* a classic OAuth App. The App declares **read-only** permissions and lets the user pick **which repos** to expose; a classic OAuth App's `repo` scope is all-or-nothing (full read+write to every private repo), which the App model avoids.
- **No private key in V1.** All reads use the user-to-server token, which is itself bounded by the App's read-only permissions + the installed repos (block b02-13 D9). Installation-token / JWT minting is deferred (only needed to act as the App with no user present).
- **Connect flow** (auth concern, lives outside the connector folder): `/api/auth/github/start` sets a CSRF `state` cookie and redirects to `github.com/apps/<slug>/installations/new`; `/api/auth/github/callback` verifies `state`, exchanges `code` for the token server-side (App client secret, never client-side), and persists to `oauth_tokens` (`provider = "github"`, no refresh, no expiry — "Expire user tokens" is left off on the App). Three env vars: `GITHUB_APP_CLIENT_ID` / `GITHUB_APP_CLIENT_SECRET` / `GITHUB_APP_SLUG`.
- **Three single-connector tiles** (like `kanban-board`, no shared adapter): `gh-pr-list` (PR-act-on queue + CI-status dot), `gh-issue-list` (per repo/org), `gh-notification-list` (inbox). Hooks import the connector directly.
- **GraphQL for PRs + issues** (nested data, status rollup, one round-trip); **REST for notifications** (GitHub's GraphQL API has no notifications inbox). 60s in-memory cache keyed by `(userId, mode, filters)`.
- **`not-found` error kind** (added to the shared `IntegrationErrorKind`): an `issues`/`prs` query against a repo the user didn't add to the installation maps to a friendly "repo not in your GitHub connection" pill instead of a 500.
- RLS is inherited — github tokens live in the same `oauth_tokens` table under the same b02-15 `next_auth.uid() = user_id` policy; migration `0004` only widens the `provider` CHECK constraint.

## Goodreads (per-shelf RSS, auth-free)

Operator setup, env-var schema (none), and module layout live in **`connectors/goodreads/README.md`**. Quick recap:

- **No env vars.** Goodreads's official API was retired to new keys in December 2020; per-shelf RSS at `goodreads.com/review/list_rss/{userId}?shelf={slug}` is the only stable read path. Operator must set their Goodreads profile visibility to **"Anyone (including people who aren't logged in to Goodreads)"** — README documents the exact setting path. Numeric user ID is taken from the profile URL (`goodreads.com/user/show/{ID}-name`).
- **Third connector pattern — external + auth-free.** `auth.ts` is a no-op stub for canonical-layout symmetry; `client.ts` is server-only and runs through the proxy route at `/api/goodreads/shelf` so the public RSS fetch happens server-side (uniform sanitization point + IP-rate-limit isolation). Same `IntegrationError` envelope as Calendar / Trello / Sheets; the `auth` kind is repurposed for "data inaccessible due to source-side privacy" — Goodreads serves a 404 (or HTML login wall) for private profiles, both mapped to the same user-facing pill.
- 60-second in-memory cache keyed by `(userId, shelfName, limit)`. RSS XML parsed via `fast-xml-parser`; HTML fields stripped at the single sanitization point in `client.ts`.
- Feeds the **shared `media-list` tile** (with Trakt), via the adapter at `connectors/goodreads/tiles/media-list.tsx`. The tile renders cover/title/subtitle rows with 4 display variants — see `tiles/media-list/README` if you split it out, or the connector's README for the variant table.
- Config UI: universal panel `gear` → numeric user ID + free-text shelf slug (`/^[a-z0-9-]+$/`) + limit 1–50 + display variant (Title / +Subtitle / +Cover [default] / Cover only). Adapter's `topbarLabel` title-cases the shelf slug (e.g. `currently-reading` → `Currently Reading`).

## Trakt (single-user API key — public lists only in v1)

Operator setup, env-var schema, and module layout live in **`connectors/trakt/README.md`**. Quick recap:

- One env var in `.env.local`: `TRAKT_CLIENT_ID`. Register an API app at <https://trakt.tv/oauth/applications>; the Client ID alone is sufficient for public-list reads (sent as the `trakt-api-key` header). Client Secret + user OAuth land with multi-user auth (b02-06) when private lists become reachable.
- Tokens never reach the client. Server adapter (`connectors/trakt/client.ts`) is the only place that reads `process.env.TRAKT_CLIENT_ID`; renderers go through `app/api/trakt/list`.
- Server adapter exposes `getList({ username, slug })` (list metadata for the topbar denormalization) and `getListItems({ username, slug, limit })` (normalized `TraktListItem[]`); same `IntegrationError` envelope as the other external connectors; 60s in-memory cache (separate keyspaces for meta and items).
- **Type filter at the source-adapter boundary.** Trakt list items can be `movie`, `show`, `season`, `episode`, or `person`. v1 renders movies + shows only; everything else is dropped server-side **before** the `limit` slice so a list mixed with people doesn't return an under-filled result.
- **Posters from Trakt's `?extended=images` CDN.** The free-tier client_id receives `media.trakt.tv/images/...` URLs alongside the items payload — no TMDB dependency.
- Feeds the **shared `media-list` tile** (with Goodreads), via the adapter at `connectors/trakt/tiles/media-list.tsx`. The tile renders the same cover/title/subtitle row layout — the year goes in the subtitle slot. The 4 display variants (`title` / `title-subtitle` / `full` / `cover`) apply uniformly.
- Cards talk to the server only via the route handler at `app/api/trakt/list/route.ts`. Hook (`use-trakt-list`) wraps it with `@tanstack/react-query`. A second hook (`use-config-name-sync`) keeps `config.listName` denormalized so `topbarLabel(card)` is a pure function of the card; the Trakt adapter calls this hook from inside `useData` to preserve the side effect.
- Config UI: universal panel `gear` → free-text username + free-text list slug + limit 1–50 + display variant. `topbarLabel` falls back to the title-cased slug until the metadata fetch lands; once `listName` is denormalized, the topbar uses the list's actual name (e.g. `WATCHING`).

## Keep — service-account + domain-wide delegation (b02-12)

Read-only views of Google Keep notes via the **official Keep REST API v1** (`keep.googleapis.com/v1/notes`). Auth is **service account + domain-wide delegation** — Google's Keep REST API does not support user-OAuth scope grants (the `keep.readonly` scope is not in Google's OAuth 2.0 scopes catalog and not selectable on the consent screen), so LENS uses a Workspace-admin-configured SA to impersonate signed-in users.

- **Workspace gate.** Keep is admin-bound to a single Workspace domain via `LENS_KEEP_WORKSPACE_DOMAIN` (server) + `NEXT_PUBLIC_LENS_KEEP_WORKSPACE_DOMAIN` (client). `AddCardPanel` (`components/panel/AddCardPanel.tsx`) hides Keep from the picker when `session.user.hd !== <configured-domain>`. `client.ts` `assertWorkspaceUser` enforces the same check server-side.
- **SA + DWD setup.** Operator follows `app/connectors/keep/README.md`: create SA in GCP, register it for DWD with `keep.readonly` in the Workspace admin console, paste the JSON key into `GOOGLE_KEEP_SA_KEY_JSON`.
- **No user-side auth step.** No `/settings → Connect Keep` button; no scope-grant prompt; Keep just works for users in the org. Auth happens server-side in `lib/auth/google-keep-sa.ts` (JWT bearer assertion → impersonated access token, cached per user for ~1 h).
- **No sidecar / no parking branches needed.** The b02-04 era `gkeepapi` Python sidecar was removed (the `parking/keep-suspended` branches on both repos preserve the historical implementation if ever needed).
- **Read-only.** v1 write capability is narrow; LENS Keep is read-only. The b02-05 / b02-09 `tag-like` + `note-like` payload adapters that wrote to Keep via the old sidecar were removed.
- **No color.** Keep REST API v1 doesn't expose per-note color — all notes render against the neutral note surface. The legacy `lens-keep-note--<color>` CSS classes still ship for forward compatibility.

## Scratchpad (local connector — Phase 2 storage = `localStorage`, Phase 3 = Supabase)

Operator setup is a no-op (no env vars). Module docs in **`connectors/scratchpad/README.md`**. Key points:

- **Local-connector pattern** — first instance, documented in `connectors/README.md`. `auth.ts` is a stub (`{ envVars: [], setupDoc: 'N/A — local data' }`); `client.ts` is a `localStorage['lens.scratchpad']` facade; renderers consume `useScratchpad()` from `lib/hooks/use-scratchpad.ts` (a `useSyncExternalStore` wrapper with cached snapshots — required because `getSnapshot` must be referentially stable).
- **Persistence schema v2 (b02-06):** `{ version: 2, binding: BoundSource | null, content: string }`. `BoundSource = { connector, sourceId, sourceTitle, parentTitle?, originalContent, href?, meta? }`. Mismatched / missing version → fresh state (v1 → v2 wipes the legacy clip list). Single active doc, not a list.
- Feeds the **`note-buffer` tile** (single-connector — scratchpad is the only consumer of the binding). Tile component renders a `<textarea>` bound to `content`; `TopbarContent` renders `<parentTitle> | <sourceTitle>` while bound.
- **Edit-on-blur write-back** — see "Selection-binding flow" in the Plugins section. The producer's connector adapter (`payloadAdapters["clip-like"].onContentEdited`) runs through the b02-05 retry queue with backoff + reconnect pill. Read-only sources (Sheets, Tasks, Goodreads, Trakt) omit the adapter; the textarea renders read-only with a banner.
- Debug affordance: `NEXT_PUBLIC_LENS_DEBUG=1` exposes "Bind sample source" in the gear panel. Stripped from production bundles.

## Auth — multi-user (b02-15)

Phase 2 closer. Replaces the b02-pre-15 single-user env-var pattern with per-user OAuth persisted in Supabase under Postgres Row Level Security. App boots into `/sign-in` for unauthenticated requests; the Auth.js middleware (`middleware.ts`) handles redirect for pages and 401-JSON for `/api/*`.

**Provider model.** Google is the only Auth.js sign-in provider — covers Calendar / Sheets / Tasks via the union scope `calendar.events + spreadsheets.readonly + tasks.readonly`. Trello is a *connection* (not a sign-in provider): users sign in with Google first, then click "Connect Trello" in `/settings`, which routes through Trello's documented **fragment-token flow** (`/api/auth/trello/start` → `trello.com/1/authorize` → `/trello-callback` reads `#token=…` → `POST /api/auth/trello/store` validates + persists). OAuth 1.0a was rejected — brittle in Auth.js v5 + Trello's docs nudge personal apps toward the fragment-token flow.

**Session strategy.** JWT (Auth.js v5 default with the Supabase adapter). The `session` callback also mints a *separate* Supabase access JWT signed with `SUPABASE_JWT_SECRET` so RLS policies (which call `next_auth.uid()`) resolve to the same user id used by the adapter. The Supabase JWT lives on the session as `supabaseAccessToken` and never reaches the client bundle (it's read from the session by `getRouteSession()` server-side).

**Token storage.** OAuth access + refresh tokens are written to `public.oauth_tokens` (one row per `(user_id, provider)`) with the **plaintext encrypted via Supabase Vault**. The plain columns (`access_token_secret_id`, `refresh_token_secret_id`) hold only the vault secret uuid; reads decrypt via the `vault.decrypted_secrets` view exposed to the service role. Vault chosen over pgsodium because Supabase deprecated direct pgsodium usage in favor of Vault, and the migration's `vault_create_secret` / `vault_update_secret` SECURITY DEFINER wrappers keep the service-role admin client free of `vault.*` schema knowledge.

**Per-request user context.** Connector-side code (`getGoogleAccessToken`, `trelloFetch`, …) reads the userId from a Node `AsyncLocalStorage` populated by `lib/auth/route-wrapper.ts` (`authedRoute(handler)`). Every connector route handler (`app/api/{google,trello,keep}/**`) is wrapped — the wrapper validates the next-auth session, rejects with 401 JSON when missing, and otherwise scopes the call to `withUser(userId)`. This keeps the connector clients' shapes unchanged (no userId-spraying through every signature).

**Layout + scratchpad sync.** `lib/workspace/SyncBridge.tsx` and `connectors/scratchpad/SyncBridge.tsx` are non-rendering client components mounted in the root layout. On first authenticated mount each pulls server state, hydrates the local Zustand store (replacing localStorage cache when the server has content), or migrates local state via the idempotent `POST /api/local/{layout,scratchpad}` endpoint when the server is empty. Subsequent mutations PUT debounced 750ms. localStorage stays as a warm cache and gets cleared on sign-out (`UserMenu`).

**Pending-writes queue.** The b02-05 client-side localStorage queue is reachable from the same `enqueueWrite` shape but the server-side path (`POST /api/local/pending-writes` + `POST /api/local/pending-writes/drain`) is the canonical owner. Drain runs server-side with backoff `1s / 5s / 30s / 5m`; permanent failures (auth) keep the row with `last_error` set so the client's reconnect pill (b02-05) still surfaces. Client-side worker removal moves to a follow-up — the server path runs alongside it now without conflict.

**Sign-out.** `UserMenu` clears the per-user localStorage keys (`lens.workspaces`, `lens.layout`, `lens.scratchpad`, `lens.scratchpad_pending_write`, `lens.payload_pending_write`) before calling `signOut()`. Theme keys are preserved (per-browser, not per-user).

## Acceptance criteria

Tracked in the project's internal pipeline. Block-level acceptance lives in each block's spec file (internal).
