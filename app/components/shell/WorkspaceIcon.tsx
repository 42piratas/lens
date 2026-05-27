"use client";

import {
  Anchor,
  Bike,
  Book,
  Brain,
  Briefcase,
  Calendar,
  Camera,
  Cloud,
  Coffee,
  Compass,
  Dumbbell,
  Flame,
  Gamepad2,
  Globe,
  Heart,
  House,
  LayoutGrid,
  Lightbulb,
  Map,
  Moon,
  Mountain,
  Music,
  Palette,
  Plane,
  Rocket,
  Sailboat,
  Sparkles,
  Star,
  Sun,
  Target,
  TreePine,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { DynamicIcon } from "lucide-react/dynamic";
import { isQuickPickIcon, isWorkspaceIconName } from "@/lib/workspace/icons";

/**
 * Quick-pick fast path — static imports for the 32 curated icons. Imported
 * eagerly because every workspace tile in the Dock renders one of these
 * by default; lazy-loading would flicker on every reload.
 *
 * Keys are kebab-case (lucide canonical) — match
 * `WORKSPACE_QUICK_PICK_ICONS` in `lib/workspace/icons.ts`.
 */
const QUICK_PICK_REGISTRY: Record<string, LucideIcon> = {
  "anchor": Anchor,
  "bike": Bike,
  "book": Book,
  "brain": Brain,
  "briefcase": Briefcase,
  "calendar": Calendar,
  "camera": Camera,
  "cloud": Cloud,
  "coffee": Coffee,
  "compass": Compass,
  "dumbbell": Dumbbell,
  "flame": Flame,
  "gamepad-2": Gamepad2,
  "globe": Globe,
  "heart": Heart,
  "house": House,
  "layout-grid": LayoutGrid,
  "lightbulb": Lightbulb,
  "map": Map,
  "moon": Moon,
  "mountain": Mountain,
  "music": Music,
  "palette": Palette,
  "plane": Plane,
  "rocket": Rocket,
  "sailboat": Sailboat,
  "sparkles": Sparkles,
  "star": Star,
  "sun": Sun,
  "target": Target,
  "tree-pine": TreePine,
  "zap": Zap,
};

export function WorkspaceIcon({ name, size = 18 }: { name: string; size?: number }) {
  if (isQuickPickIcon(name)) {
    const Icon = QUICK_PICK_REGISTRY[name] ?? LayoutGrid;
    return <Icon size={size} strokeWidth={1.75} aria-hidden />;
  }
  if (isWorkspaceIconName(name)) {
    return (
      <DynamicIcon
        name={name as never}
        size={size}
        strokeWidth={1.75}
        aria-hidden
        fallback={() => <LayoutGrid size={size} strokeWidth={1.75} aria-hidden />}
      />
    );
  }
  return <LayoutGrid size={size} strokeWidth={1.75} aria-hidden />;
}

export function workspaceIconExists(name: string): boolean {
  return isWorkspaceIconName(name);
}
