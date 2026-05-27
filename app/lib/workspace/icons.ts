/**
 * Workspace icon model — backed by lucide-react.
 *
 * Two layers:
 *
 * - `WORKSPACE_QUICK_PICK_ICONS` — 32 hand-curated kebab-case lucide names.
 *   Rendered eagerly via static imports in `WorkspaceIcon.tsx` for the
 *   Dock fast path and as the default grid in the picker dialog.
 * - Any other lucide icon name passes validation. The picker exposes a
 *   "Browse all icons" affordance for the full ~1500-icon set; renders
 *   lazy-loaded via lucide's `DynamicIcon`.
 *
 * Names are kebab-case (lucide canonical: `layout-grid`, `tree-pine`).
 * Pre-b02-08 persisted state used PascalCase (`LayoutGrid`,
 * `TreePine`); `migrateLegacyIconName` converts on read.
 */
import { iconNames as LUCIDE_ICON_NAMES } from "lucide-react/dynamic";

export const WORKSPACE_QUICK_PICK_ICONS = [
  "layout-grid",
  "briefcase",
  "house",
  "heart",
  "star",
  "sparkles",
  "calendar",
  "target",
  "rocket",
  "compass",
  "mountain",
  "tree-pine",
  "coffee",
  "music",
  "camera",
  "gamepad-2",
  "book",
  "palette",
  "lightbulb",
  "zap",
  "flame",
  "sun",
  "moon",
  "cloud",
  "anchor",
  "globe",
  "map",
  "plane",
  "sailboat",
  "bike",
  "dumbbell",
  "brain",
] as const;

export type WorkspaceQuickPickIcon = (typeof WORKSPACE_QUICK_PICK_ICONS)[number];

export const DEFAULT_WORKSPACE_ICON: WorkspaceQuickPickIcon = "layout-grid";

const QUICK_PICK_SET = new Set<string>(WORKSPACE_QUICK_PICK_ICONS);
const ALL_LUCIDE_SET = new Set<string>(LUCIDE_ICON_NAMES);

/** True when `name` is one of the curated quick-pick icons. */
export function isQuickPickIcon(name: string): name is WorkspaceQuickPickIcon {
  return QUICK_PICK_SET.has(name);
}

/**
 * True when `name` is any valid lucide-react icon (kebab-case canonical).
 * Used by the store + schema as the validation gate — any lucide name is
 * acceptable for a workspace icon, not just the quick-pick set.
 */
export function isWorkspaceIconName(name: string): boolean {
  return ALL_LUCIDE_SET.has(name);
}

/**
 * Convert a PascalCase lucide name (legacy persisted state) to kebab-case.
 * Examples: `LayoutGrid` → `layout-grid`, `TreePine` → `tree-pine`,
 * `Gamepad2` → `gamepad-2`. Idempotent — kebab-case input is unchanged.
 */
export function migrateLegacyIconName(name: string): string {
  if (!name) return DEFAULT_WORKSPACE_ICON;
  // Already kebab-case (no uppercase) — return as-is.
  if (!/[A-Z]/.test(name)) return name;
  return name
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/([a-zA-Z])(\d)/g, "$1-$2")
    .toLowerCase();
}

/** Pick a random quick-pick icon — used when seeding. */
export function randomWorkspaceIcon(): WorkspaceQuickPickIcon {
  const i = Math.floor(Math.random() * WORKSPACE_QUICK_PICK_ICONS.length);
  return WORKSPACE_QUICK_PICK_ICONS[i] ?? DEFAULT_WORKSPACE_ICON;
}

/** All lucide icon names (kebab-case). For the "Browse all icons" overlay. */
export function allLucideIconNames(): readonly string[] {
  return LUCIDE_ICON_NAMES;
}
