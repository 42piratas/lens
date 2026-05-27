"use client";

import { Sun, Moon } from "lucide-react";
import { getTheme } from "@/themes";
import { useThemeBootstrap, useThemeStore } from "@/lib/theme/store";

export function ThemeToggle() {
  useThemeBootstrap();
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);

  const mode = getTheme(theme)?.mode ?? "light";
  const Icon = mode === "dark" ? Sun : Moon;
  const label = mode === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className="lens-dock-btn"
    >
      <Icon size={18} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
