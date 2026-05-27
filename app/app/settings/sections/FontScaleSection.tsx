"use client";

import { useEffect } from "react";
import { usePrefsStore } from "@/lib/prefs/store";
import { FONT_SCALE_MAX, FONT_SCALE_MIN, FONT_SCALE_STEP } from "@/lib/prefs/bootstrap";
import { SettingsSection } from "../SettingsSection";

export function FontScaleSection() {
  const fontScale = usePrefsStore((s) => s.fontScale);
  const setFontScale = usePrefsStore((s) => s.setFontScale);
  const hydrate = usePrefsStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const pct = Math.round(fontScale * 100);

  return (
    <SettingsSection id="fontscale" title="Font scale">
      <div className="lens-settings-row">
        <label htmlFor="settings-fontscale" className="lens-settings-row-label">
          Scale
        </label>
        <div className="lens-settings-row-value">
          <input
            id="settings-fontscale"
            type="range"
            className="lens-settings-range"
            min={FONT_SCALE_MIN}
            max={FONT_SCALE_MAX}
            step={FONT_SCALE_STEP}
            value={fontScale}
            onChange={(e) => setFontScale(parseFloat(e.target.value))}
          />
          <span className="lens-settings-row-hint lens-settings-pct">{pct}%</span>
        </div>
      </div>
    </SettingsSection>
  );
}
