# Add a connector

A **connector** in LENS provides data. Its folder owns auth, the data client, per-tile adapters, the config UI, and now the API route handlers. This guide takes you from `_template/` to a working connector in ~10 minutes.

Read first: [`app/connectors/README.md`](../../app/connectors/README.md) — the full contract for `ConnectorManifest`.

## What a connector folder looks like

```
app/connectors/<id>/
  manifest.tsx           ConnectorManifest export — id, name, icon, scopes, tiles, adapters
  auth.ts                server-side auth helper (reads tokens from oauth_tokens table)
  client.ts              source adapter — cached fetchers + normalized error envelope
  types.ts               connector-internal types (normalized rows, etc.)
  hooks/                 React-side data hooks (useThing(args))
  tiles/                 per-(this connector × shared tile) TileAdapter exports
    <tile-id>.tsx        TileAdapter — useData(card) + topbar overrides
  payload-adapters/      optional — accepts foreign drag payloads (tag-like, clip-like, ...)
  api/                   route handlers, one per HTTP endpoint
    <route>/route.ts     standard Next.js route handler
  config.tsx             connector-specific body inside the universal card-config panel
  README.md              operator setup + required env vars + scopes
  __tests__/             vitest specs (client, utils, route handlers)
```

The `id` is kebab-case and matches the folder name. The codegen verifies this — mismatch fails CI.

## Step-by-step

1. **Copy the template.**
   ```bash
   cp -r app/connectors/_template app/connectors/<your-id>
   ```
2. **Edit `manifest.{ts,tsx}`.** Set `id`, `name`, `icon` (a lucide-react component), `description`, `auth.envVars`, `auth.setupDoc`, `tiles[]`, `defaultConfig`, `configSchema`, and `ConfigBody`. If the connector is feature-gated (e.g. dormant pending external dependency), set `enabled: () => process.env.NEXT_PUBLIC_<NAME>_ENABLED === "1"`.
3. **Implement `auth.ts`.** Server-only. For OAuth-style providers, read tokens from the `oauth_tokens` table via the user-context helpers in `lib/auth/route-wrapper.ts`. Never read `process.env` for per-user tokens (Phase 2 closed that pattern).
4. **Implement `client.ts`.** All outbound HTTP goes through this module. Wrap calls with the same `IntegrationError` envelope used by other connectors so route handlers can map errors uniformly. Add a 60s in-memory cache keyed by request shape if the upstream supports it.
5. **Add API routes** under `<id>/api/<route>/route.ts`. Each route is a standard Next.js route handler. Wrap it with `authedRoute(...)` from `lib/auth/route-wrapper.ts` so the user id is available via `AsyncLocalStorage`.
6. **Add per-tile adapters** in `<id>/tiles/<tile-id>.tsx` for shared tiles (media-list, task-list, etc.). Only required if the connector reuses an existing shared tile. For single-connector tiles, the tile component imports the connector's hooks directly and there's no adapter file.
7. **Write the config UI** in `config.tsx`. The component receives `{ config, tile, onChange }`. Render whatever inputs the connector needs.
8. **Document in `README.md`.** Operator setup steps (what env vars to set, where to get tokens, etc.) — the architect cross-references these into `app/CLAUDE.md` later.
9. **Add tests** under `__tests__/`. Cover `client.ts` happy path, error mapping (`401 → auth`, `429 → rate-limit`), and any non-trivial normalization.
10. **Regenerate the registry.**
    ```bash
    pnpm gen:registries
    ```
    This rewrites `app/connectors/index.ts` to include your manifest and writes the re-export shims under `app/api/<prefix>/<route>/route.ts` so Next.js still discovers the routes at the same URLs.
11. **Verify.**
    ```bash
    pnpm typecheck && pnpm lint && pnpm test --run && pnpm gen:registries:check && pnpm build
    ```

## Custom URL prefix

If your connector id needs a different URL surface than the default (`<id>`), edit `CONNECTOR_API_PREFIX_OVERRIDES` in `app/scripts/gen-registries.ts`. Example: `google-calendar` → `google/calendar` so the public URL is `/api/google/calendar/...` not `/api/google-calendar/...`.

## 10-minute checklist

- [ ] Copied `_template/`, renamed folder to your id (kebab-case)
- [ ] `manifest.{ts,tsx}`: `id` matches folder, `name`/`icon`/`description`/`tiles`/`configSchema`/`defaultConfig`/`ConfigBody` all set
- [ ] `auth.ts` reads tokens from `oauth_tokens` via the route wrapper, not `process.env`
- [ ] `client.ts` wraps errors in `IntegrationError`
- [ ] At least one route handler exists under `<id>/api/<route>/route.ts`
- [ ] `README.md` documents operator setup (env vars, scopes, where to get tokens)
- [ ] `__tests__/client.test.ts` covers the happy path + 401 + 429
- [ ] `pnpm gen:registries` ran clean (no errors)
- [ ] `pnpm typecheck && pnpm lint && pnpm test --run && pnpm gen:registries:check && pnpm build` all green
- [ ] PR opened against `main`
