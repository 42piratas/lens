"use client";

import { useEffect } from "react";
import { usePrefsStore } from "@/lib/prefs/store";
import type { DockPos } from "@/lib/prefs/bootstrap";
import { SettingsSection } from "../SettingsSection";

const OPTIONS: { id: DockPos; label: string }[] = [
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
];

export function DockPositionSection() {
  const dockPos = usePrefsStore((s) => s.dockPos);
  const setDockPos = usePrefsStore((s) => s.setDockPos);
  const hydrate = usePrefsStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <SettingsSection id="dock" title="Dock">
      <div className="lens-settings-row">
        <span className="lens-settings-row-label">Position</span>
        <div className="lens-settings-row-value">
          <div className="lens-segmented" role="radiogroup" aria-label="Dock position">
            {OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={dockPos === opt.id}
                onClick={() => setDockPos(opt.id)}
                className="lens-segmented-btn"
                data-pressed={dockPos === opt.id ? "true" : undefined}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
