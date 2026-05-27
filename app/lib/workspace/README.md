# lib/workspace

Workspaces — saved snapshots of dashboard state. Each workspace owns its own card layout, theme, and (in the future) per-canvas settings. The active-workspace id is persisted globally; switching it swaps everything atomically.

## Schema

```ts
type Workspace = {
  id: string;
  name: string;
  icon: string;        // lucide icon name (curated list in `icons.ts`)
  createdAt: number;   // ms epoch
  updatedAt: number;
  theme: string;       // theme id from app/themes registry
  layout: LayoutCard[];
};

type WorkspacesState = {
  version: 1;
  activeId: string;
  workspaces: Workspace[];
};
```

Persisted under `localStorage["lens.workspaces"]`.

## Migration

On first hydrate, if `lens.workspaces` is missing:

1. Read legacy `lens.layout` (v2). If valid, its cards become the layout of a single `Default` workspace (`id: "default"`).
2. Read legacy `lens.theme` (active theme id). It becomes the default workspace's `theme`.
3. The legacy `lens.layout` key is **removed** so subsequent boots use the workspaces envelope only.
4. `lens.theme` and the per-mode preference keys (`lens.theme.light`, `lens.theme.dark`) are **kept** — those encode global user preferences, independent of any workspace.

Migration is idempotent: a fresh boot with no legacy keys produces an empty Default workspace.

## Store routing

Two consumer stores delegate persistence to the workspace store:

- **`lib/layout/store`** — `cards` reflects the active workspace's `layout`. CRUD ops call `useWorkspaceStore.getState().setActiveLayout(next)`. On hydrate, layout subscribes to workspace-store changes and re-mirrors when the active id swaps.
- **`lib/theme/store`** — `setTheme(id)` updates the active workspace's `theme` AND the per-mode preference (global). On hydrate, theme subscribes to workspace switches and re-applies the new active workspace's theme.

This means: switching workspaces atomically swaps the layout AND the active theme, with a single user gesture.

## Per-workspace vs global

| Setting | Scope | Persisted under |
|---|---|---|
| Active theme id | Per-workspace | `lens.workspaces[i].theme` |
| Light theme pick | Global | `lens.theme.light` |
| Dark theme pick | Global | `lens.theme.dark` |
| Layout (cards) | Per-workspace | `lens.workspaces[i].layout` |
| `startOfWeek` | Global (today) | (per-card config) |
| Dock collapsed state | Session-level | (not persisted) |

## UI

The Dock inserts a `WorkspaceSwitcher` between the brand and the functional icons:

```
[skull]
[divider]
[ws-1] [ws-2] ... [+]
[divider]
[plus] [grid] [help] [settings] [theme-toggle] [theme-picker] [chat]
```

Interactions:

- **Click a workspace** — switch active.
- **Right-click a workspace** — context menu (Rename, Change icon, Duplicate, Delete).
- **Click the `+`** — open the create dialog.

The icon picker exposes the curated list in `icons.ts` (32 lucide icons by default; extend by appending names — every entry is statically imported by `WorkspaceIcon.tsx`).

## Adding to the icon set

1. Append the `lucide-react` export name to `WORKSPACE_ICON_NAMES` in `icons.ts` (must match the export verbatim — PascalCase).
2. Add the import + registry entry in `components/shell/WorkspaceIcon.tsx`.

The store accepts only registered icon names; unknown names fall back to `LayoutGrid`.

## Tests

`__tests__/store.test.ts` covers:

- Migration from legacy `lens.layout` to a Default workspace
- Fresh boot with no legacy data
- Create / duplicate / rename / setIcon / remove
- Validation: empty names rejected, unknown icons rejected
- Last-workspace deletion is refused
- Switching a workspace applies its theme to the DOM
- Layout round-trips through localStorage

## Future-facing

- Drive-JSON / Supabase persistence — picks up in b02-06 (Auth) on the same migration path as the layout schema bump.
- Per-account vs sharable workspaces — multi-tenant interaction TBD; default per-account.
- Workspace metadata: color tag, sort order, last-used timestamp surfacing in the switcher tooltip.
