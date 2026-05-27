import { describe, it, expect } from "vitest";
import {
  WORKSPACE_QUICK_PICK_ICONS,
  DEFAULT_WORKSPACE_ICON,
  isQuickPickIcon,
  isWorkspaceIconName,
  migrateLegacyIconName,
  randomWorkspaceIcon,
  allLucideIconNames,
} from "../icons";

describe("workspace icons", () => {
  it("quick-pick contains 32 kebab-case names", () => {
    expect(WORKSPACE_QUICK_PICK_ICONS).toHaveLength(32);
    for (const name of WORKSPACE_QUICK_PICK_ICONS) {
      expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("DEFAULT_WORKSPACE_ICON is a quick-pick", () => {
    expect(isQuickPickIcon(DEFAULT_WORKSPACE_ICON)).toBe(true);
  });

  it("isWorkspaceIconName accepts any valid lucide name", () => {
    expect(isWorkspaceIconName("layout-grid")).toBe(true);
    expect(isWorkspaceIconName("atom")).toBe(true); // not in quick-pick but valid
    expect(isWorkspaceIconName("anchor")).toBe(true);
    expect(isWorkspaceIconName("nonsense-icon-xyz")).toBe(false);
  });

  it("isWorkspaceIconName rejects PascalCase (canonical form is kebab)", () => {
    expect(isWorkspaceIconName("LayoutGrid")).toBe(false);
    expect(isWorkspaceIconName("Briefcase")).toBe(false);
  });

  it("isQuickPickIcon distinguishes the curated set from full lucide", () => {
    expect(isQuickPickIcon("layout-grid")).toBe(true);
    expect(isQuickPickIcon("atom")).toBe(false); // valid lucide, not quick-pick
  });

  it("migrateLegacyIconName converts PascalCase to kebab-case", () => {
    expect(migrateLegacyIconName("LayoutGrid")).toBe("layout-grid");
    expect(migrateLegacyIconName("TreePine")).toBe("tree-pine");
    expect(migrateLegacyIconName("Briefcase")).toBe("briefcase");
    expect(migrateLegacyIconName("Gamepad2")).toBe("gamepad-2");
  });

  it("migrateLegacyIconName is idempotent on kebab-case input", () => {
    expect(migrateLegacyIconName("layout-grid")).toBe("layout-grid");
    expect(migrateLegacyIconName("tree-pine")).toBe("tree-pine");
    expect(migrateLegacyIconName("gamepad-2")).toBe("gamepad-2");
  });

  it("migrateLegacyIconName falls back to default on empty input", () => {
    expect(migrateLegacyIconName("")).toBe(DEFAULT_WORKSPACE_ICON);
  });

  it("randomWorkspaceIcon returns a valid quick-pick", () => {
    for (let i = 0; i < 10; i++) {
      const name = randomWorkspaceIcon();
      expect(isQuickPickIcon(name)).toBe(true);
    }
  });

  it("allLucideIconNames returns the full lucide set (>=1000)", () => {
    const all = allLucideIconNames();
    expect(all.length).toBeGreaterThanOrEqual(1000);
    expect(all).toContain("layout-grid");
    expect(all).toContain("atom");
  });
});
