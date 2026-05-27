import { SettingsSection } from "../SettingsSection";

export function PluginsSection() {
  return (
    <SettingsSection id="plugins" title="Plugins & write scopes">
      <p className="lens-settings-tbd">
        To be wired with the b02-05 plugin / payload-adapter contract — surfaces each connector&apos;s
        write scopes as opt-in toggles.
      </p>
    </SettingsSection>
  );
}
