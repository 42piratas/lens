"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { useWorkspaceStore, useActiveWorkspace } from "@/lib/workspace/store";
import { layoutCardSchema } from "@/lib/layout/schema";
import { z } from "zod";
import { SettingsSection } from "../SettingsSection";

const importSchema = z.object({
  workspace: z.string().min(1),
  exportedAt: z.number(),
  cards: z.array(layoutCardSchema),
});

export function ImportExportSection() {
  const active = useActiveWorkspace();
  const setActiveLayout = useWorkspaceStore((s) => s.setActiveLayout);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const onExport = () => {
    if (!active) return;
    const payload = {
      workspace: active.name,
      exportedAt: Date.now(),
      cards: active.layout,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lens-${active.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportClick = () => {
    setMsg(null);
    fileRef.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = importSchema.parse(JSON.parse(text));
      setActiveLayout(parsed.cards);
      setMsg({ kind: "ok", text: `Imported ${parsed.cards.length} cards from "${parsed.workspace}".` });
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Invalid layout file." });
    }
  };

  return (
    <SettingsSection id="io" title="Import / export">
      <div className="lens-settings-row">
        <span className="lens-settings-row-label">Active layout</span>
        <div className="lens-settings-row-value">
          <button type="button" className="lens-settings-btn" onClick={onExport} disabled={!active}>
            <Download size={14} aria-hidden />
            Export
          </button>
          <button type="button" className="lens-settings-btn" onClick={onImportClick}>
            <Upload size={14} aria-hidden />
            Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            onChange={onFile}
            className="lens-settings-file-hidden"
          />
        </div>
      </div>

      {msg && (
        <p className="lens-settings-row-hint lens-settings-msg" data-kind={msg.kind}>
          {msg.text}
        </p>
      )}
    </SettingsSection>
  );
}
