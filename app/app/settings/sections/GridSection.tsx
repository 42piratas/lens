import { SettingsSection } from "../SettingsSection";

export function GridSection() {
  return (
    <SettingsSection id="grid" title="Grid & tile sizes">
      <div className="lens-settings-row">
        <span className="lens-settings-row-label">Grid dimensions</span>
        <div className="lens-settings-row-value">
          <span className="lens-settings-row-hint">20 × 20 (fixed)</span>
        </div>
      </div>

      <p className="lens-settings-tbd">
        Per-tile minSize / maxSize editor — to be wired (resolves TD-03 / O6).
      </p>
    </SettingsSection>
  );
}
