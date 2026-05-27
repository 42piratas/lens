"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { ConnectionsSection } from "./sections/ConnectionsSection";
import { ThemeSection } from "./sections/ThemeSection";
import { FontScaleSection } from "./sections/FontScaleSection";
import { DockPositionSection } from "./sections/DockPositionSection";
import { WorkspacesSection } from "./sections/WorkspacesSection";
import { PinboardSection } from "./sections/PinboardSection";
import { GridSection } from "./sections/GridSection";
import { PluginsSection } from "./sections/PluginsSection";
import { ImportExportSection } from "./sections/ImportExportSection";

export function SettingsClient() {
  return (
    <div className="lens-settings">
      <div className="lens-settings-content">
        <header className="lens-settings-header">
          <h1 className="lens-settings-title">Settings</h1>
          <Link
            href="/"
            className="lens-settings-close"
            aria-label="Close settings"
            title="Close settings"
          >
            <X size={18} strokeWidth={1.75} aria-hidden />
          </Link>
        </header>

        <ConnectionsSection />
        <ThemeSection />
        <FontScaleSection />
        <DockPositionSection />
        <WorkspacesSection />
        <PinboardSection />
        <GridSection />
        <PluginsSection />
        <ImportExportSection />
      </div>
    </div>
  );
}
