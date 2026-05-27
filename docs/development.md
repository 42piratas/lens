# Development

## Requirements

- **Git** ≥ 2.48
- **Node** ≥ 24 (per `.nvmrc`)
- **pnpm**

## First-time setup

End-users: see the [README](../README.md) for `npx create-lens`. Contributors clone directly:

```bash
git clone https://github.com/42piratas/lens.git
cd lens/app
pnpm install
```

## Dev server

```bash
cd app/
pnpm dev          # http://localhost:3000
```

## Common scripts

| Script | What it does |
|:--|:--|
| `pnpm dev` | Next.js dev server |
| `pnpm build` | Production build |
| `pnpm start` | Run the production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint (includes the DS-token rules — no inline color literals, no hardcoded sizes) |
| `pnpm lint:check` | Lint + orphan-registry audit (CI gate) |
| `pnpm test` | Vitest, single run |
| `pnpm test:watch` | Vitest watch mode |
| `pnpm gen:registries` | Regenerate connector / tile / theme indexes + API shims after adding/removing a folder |
| `pnpm gen:registries:check` | CI gate — fails when registries are out of sync with disk |

## Environment variables

Copy [`app/.env.example`](../app/.env.example) to `app/.env.local` and fill in the values. The example file documents every required and optional variable.

Per-connector setup notes (OAuth flows, where to find each token, scope requirements) live in each connector's `README.md`:

- [`app/connectors/google-calendar/README.md`](../app/connectors/google-calendar/README.md)
- [`app/connectors/google-sheets/README.md`](../app/connectors/google-sheets/README.md)
- [`app/connectors/google-tasks/README.md`](../app/connectors/google-tasks/README.md)
- [`app/connectors/google-keep/README.md`](../app/connectors/google-keep/README.md) (Workspace-bound; service-account + domain-wide delegation — the Keep API is not in the user-OAuth scope catalog)
- [`app/connectors/trello/README.md`](../app/connectors/trello/README.md)
- [`app/connectors/trakt/README.md`](../app/connectors/trakt/README.md)
- [`app/connectors/goodreads/README.md`](../app/connectors/goodreads/README.md)
- [`app/connectors/scratchpad/README.md`](../app/connectors/scratchpad/README.md)

For dev-mode single-user OAuth (Google), run:

```bash
node scripts/google-oauth.mjs        # default: Calendar + Sheets + Tasks readonly
node scripts/google-oauth.mjs --scopes=calendar.events,spreadsheets.readonly,tasks.readonly
```

Multi-user auth shipped with b02-15 — production mode authenticates each user via Auth.js v5 and persists OAuth tokens encrypted in Supabase Vault. Dev-mode env-var tokens remain available as a single-user fallback.

## Supabase

Schema migrations live in [`app/supabase/migrations/`](../app/supabase/migrations/). Apply them with the Supabase CLI or the Supabase dashboard SQL editor. Current migrations:

- `0001_init_auth.sql` — `next_auth.*` schema, `public.{users,oauth_tokens,layouts,scratchpad,pending_writes}`, RLS policies, vault wrappers.
- `0002_vault_read_rpc.sql` — vault read/delete RPC wrappers (vault schema is not exposed to PostgREST).
- `0003_pinboards.sql` — `public.pinboards` singleton-per-user JSONB envelope with owner-only RLS and service-role grant (b02-11).

See [`docs/playbook-infra.md`](playbook-infra.md) for the full infrastructure operational guide (services, secret rotation, backups).

## Browser testing

For UI-affecting changes, validate in a real browser. The full guide is in [`docs/playbook-browser-testing.md`](playbook-browser-testing.md).

## Registry codegen

Three indexes (`connectors`, `tiles`, `themes`) and one CSS aggregator (`themes/index.css`) plus all `app/api/<connector>/.../route.ts` shims are **auto-generated** by `pnpm gen:registries`. Never hand-edit:

- `app/connectors/index.ts`
- `app/tiles/index.ts`
- `app/themes/index.ts`
- `app/themes/index.css`
- Any `app/api/<connector>/.../route.ts` file marked auto-generated

After adding or removing a folder under any of the five surfaces, run `pnpm gen:registries`. CI runs `:check` and will fail if you forget.

## Branching + PR workflow

`main` is the default branch and production source. **Never push directly to `main`.** `staging` is reserved for the dev/staging deploy environment — not a PR target. Full workflow in [`CONTRIBUTING.md`](../CONTRIBUTING.md).

Quick reference:

```bash
git fetch origin
git worktree add ../worktrees/lens--<type>-<slug> -b <type>/<slug> origin/main
cd ../worktrees/lens--<type>-<slug>
pnpm install
# do the work
git add -A && git commit -m "<type>(<scope>): <imperative subject>"
git fetch origin && git rebase origin/main
git push -u origin <type>/<slug>
gh pr create --base main
gh pr checks <PR-number> --watch
```

Branch type prefixes: `feat/`, `fix/`, `chore/`, `docs/`. All target `main`.

## CI gates

Every PR must pass:

| Gate | Catches |
|:--|:--|
| `pnpm typecheck` | Type errors |
| `pnpm lint` | Style + DS-token rules |
| `pnpm test --run` | Vitest suites |
| `pnpm gen:registries:check` | Folder added but registry not regenerated |
| `pnpm build` | Next.js production build (route resolution, etc.) |

Auto-merge is never armed.

## More

- Full app spec — [`app/CLAUDE.md`](../app/CLAUDE.md)
- Architecture overview — [`docs/architecture.md`](architecture.md)
- Contribution flow — [`CONTRIBUTING.md`](../CONTRIBUTING.md)
- Surface cookbooks — [`docs/contrib/`](contrib/)
- Infra playbook — [`docs/playbook-infra.md`](playbook-infra.md)
- Browser testing playbook — [`docs/playbook-browser-testing.md`](playbook-browser-testing.md)
