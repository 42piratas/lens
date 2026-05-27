# Contributing to LENS

Welcome. LENS is a personal PMS dashboard with five modular surfaces — connectors, tiles, themes, workspaces, and plugins. Most contributions add a new instance of one of those surfaces. This guide gets you from clone to merged PR.

## Quick start

End-users install LENS with `npx create-lens` (see the [README](README.md)). Contributors should clone the repo directly:

```bash
git clone https://github.com/42piratas/lens.git
cd lens/app
pnpm install
pnpm dev          # http://localhost:3000
```

Other useful scripts:

```bash
pnpm typecheck                 # tsc --noEmit
pnpm lint                      # eslint
pnpm test                      # vitest run
pnpm gen:registries            # regenerate connector / tile / theme indexes after adding a folder
pnpm gen:registries:check      # CI gate — fail if registries are out of sync with disk
```

## The five surfaces

| Surface | Folder | Adds | Cookbook |
|:--|:--|:--|:--|
| Connectors | `app/connectors/<id>/` | A data source (Calendar, Trello, Sheets, etc.) | [`docs/contrib/add-a-connector.md`](docs/contrib/add-a-connector.md) |
| Tiles | `app/tiles/<id>/` | A way to render data in the bento grid | [`docs/contrib/add-a-tile.md`](docs/contrib/add-a-tile.md) |
| Themes | `app/themes/<id>/` | A palette + tokens.css | [`docs/contrib/add-a-theme.md`](docs/contrib/add-a-theme.md) |
| Workspaces | per-user state | (No code surface — UI configuration) | — |
| Plugins | `app/lib/dnd-payloads/` + per-connector `payload-adapters/` | A new cross-tile drag-payload kind or absorber | [`docs/contrib/add-a-plugin-payload.md`](docs/contrib/add-a-plugin-payload.md) |

Each cookbook ends with a 10-minute checklist. Read the surface's `README.md` (`app/connectors/README.md`, etc.) for the full contract.

## Branching + PR workflow

`main` is the default branch and the production source. **Never push directly to `main`.** `staging` is a long-lived branch reserved for the dev/staging deploy environment — not a PR target.

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
```

Branch type prefixes: `feat/`, `fix/`, `chore/`, `docs/`. All target `main`.

Auto-merge is banned — the PR author opens, CI runs, the human merges.

Watch CI after every push:

```bash
gh pr checks <PR-number> --watch
```

## Required CI gates

Every PR must pass:

| Gate | Command | What it catches |
|:--|:--|:--|
| Typecheck | `pnpm typecheck` | Type errors |
| Lint | `pnpm lint` | Style + DS-token rules (no inline color literals, no hardcoded sizes) |
| Tests | `pnpm test --run` | Vitest suites |
| Registry sync | `pnpm gen:registries:check` | Connector / tile / theme folder added but `index.ts` not regenerated |
| Build | `pnpm build` | Next.js production build (route resolution, etc.) |

CI runs the full set; locally run them before pushing.

## Commit messages

Conventional commits via `commitlint`:

```
<type>(<scope>): <imperative subject, lowercase>

<optional body>
```

Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`, `revert`. Scope is usually the block id (`b02-08`) or the surface (`connectors`, `tiles`, `themes`, `plugins`).

## Code style

- **TypeScript strict.** No `any` unless interoperating with untyped externals; document the cast.
- **No raw color literals.** Visual styling must reference 42labs DS tokens (`var(--accent)`, `var(--fg-muted)`). ESLint enforces this on `style` props.
- **No hardcoded font/spacing sizes** in `style` props. Use the type scale (`text-sm`, `text-xs`) and spacing tokens.
- **Semantic intermediate tokens** for connector colors. Connectors consume `--label-{green,yellow,...}`, never raw 42labs DS colors directly. Themes remap.
- **Server-only secrets.** OAuth tokens, API keys, and service-role keys must never reach the client bundle.
- **No comments explaining what code does.** Comments should explain *why* — hidden constraints, subtle invariants, non-obvious workarounds. Self-documenting names cover the rest.

## Adding a connector / tile / theme — short version

1. Copy the `_template/` folder under the relevant surface.
2. Rename the folder to your id (kebab-case).
3. Edit `manifest.{ts,tsx}` so its `id: "..."` matches the folder name.
4. Implement the surface-specific bits (see the cookbook).
5. Run `pnpm gen:registries` to regenerate the index.
6. Run `pnpm typecheck && pnpm lint && pnpm test --run && pnpm gen:registries:check`.
7. Open a PR.

The codegen is the source of truth for the registry indexes. Never hand-edit `app/connectors/index.ts`, `app/tiles/index.ts`, `app/themes/index.ts`, or `app/themes/index.css` — they are auto-generated.

## Help

- Tech spec for the app: [`app/CLAUDE.md`](app/CLAUDE.md)
- Issues + discussion: GitHub Issues on this repo
