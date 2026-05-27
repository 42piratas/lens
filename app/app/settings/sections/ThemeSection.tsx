"use client";

import { useEffect } from "react";
import { getThemes } from "@/themes";
import { isDarkFamily } from "@/themes/types";
import { useThemeStore } from "@/lib/theme/store";
import { SettingsSection } from "../SettingsSection";

export function ThemeSection() {
  const lightThemeId = useThemeStore((s) => s.lightThemeId);
  const darkThemeId = useThemeStore((s) => s.darkThemeId);
  const setLightPreference = useThemeStore((s) => s.setLightPreference);
  const setDarkPreference = useThemeStore((s) => s.setDarkPreference);
  const syncFromDom = useThemeStore((s) => s.syncFromDom);

  useEffect(() => {
    syncFromDom();
  }, [syncFromDom]);

  const themes = getThemes();
  const lightThemes = themes.filter((t) => t.mode === "light");
  // Dark group includes the dark family (dark + dark-paper variants).
  const darkThemes = themes.filter((t) => isDarkFamily(t.mode));

  return (
    <SettingsSection id="theme" title="Theme">
      <div className="lens-settings-row">
        <label htmlFor="settings-theme-light" className="lens-settings-row-label">
          Light theme
        </label>
        <div className="lens-settings-row-value">
          <select
            id="settings-theme-light"
            className="lens-settings-select"
            value={lightThemeId}
            onChange={(e) => setLightPreference(e.target.value)}
          >
            {lightThemes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="lens-settings-row">
        <label htmlFor="settings-theme-dark" className="lens-settings-row-label">
          Dark theme
        </label>
        <div className="lens-settings-row-value">
          <select
            id="settings-theme-dark"
            className="lens-settings-select"
            value={darkThemeId}
            onChange={(e) => setDarkPreference(e.target.value)}
          >
            {darkThemes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </SettingsSection>
  );
}
