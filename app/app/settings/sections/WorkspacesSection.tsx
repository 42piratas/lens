"use client";

import { useEffect, useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { useWorkspaceStore } from "@/lib/workspace/store";
import { WorkspaceIcon } from "@/components/shell/WorkspaceIcon";
import { WorkspaceIconPicker } from "@/components/shell/WorkspaceIconPicker";
import { SettingsSection } from "../SettingsSection";

export function WorkspacesSection() {
  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeId = useWorkspaceStore((s) => s.activeId);
  const rename = useWorkspaceStore((s) => s.rename);
  const setIcon = useWorkspaceStore((s) => s.setIcon);
  const remove = useWorkspaceStore((s) => s.remove);
  const duplicate = useWorkspaceStore((s) => s.duplicate);

  const [iconEditId, setIconEditId] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const canDelete = workspaces.length > 1;

  return (
    <SettingsSection id="ws" title="Workspaces" multi>
      {!hydrated ? (
        <p className="lens-settings-tbd">Loading…</p>
      ) : (
        <ul className="lens-settings-ws-list">
          {workspaces.map((ws) => {
            const isActive = ws.id === activeId;
            const isEditingIcon = iconEditId === ws.id;
            return (
              <li
                key={ws.id}
                className="lens-settings-card lens-settings-ws-row"
                data-active={isActive ? "true" : undefined}
              >
                <button
                  type="button"
                  onClick={() => setIconEditId(isEditingIcon ? null : ws.id)}
                  aria-label={`Change icon for ${ws.name}`}
                  className="lens-settings-btn lens-settings-ws-icon-btn"
                  title="Change icon"
                >
                  <WorkspaceIcon name={ws.icon} size={16} />
                </button>

                <input
                  className="lens-settings-ws-row-input"
                  value={ws.name}
                  onChange={(e) => rename(ws.id, e.target.value)}
                  aria-label={`Workspace name (${ws.name})`}
                />

                <div className="lens-settings-ws-row-actions">
                  <button
                    type="button"
                    className="lens-settings-btn"
                    onClick={() => duplicate(ws.id)}
                    title="Duplicate"
                    aria-label="Duplicate workspace"
                  >
                    <Copy size={14} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="lens-settings-btn lens-settings-btn--danger"
                    onClick={() => {
                      if (!canDelete) return;
                      if (confirm(`Delete workspace "${ws.name}"? This cannot be undone.`)) {
                        remove(ws.id);
                      }
                    }}
                    disabled={!canDelete}
                    title={canDelete ? "Delete" : "Can't delete the last workspace"}
                    aria-label="Delete workspace"
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                </div>

                {isEditingIcon && (
                  <div className="lens-settings-ws-icon-picker-row">
                    <WorkspaceIconPicker
                      selected={ws.icon}
                      onSelect={(name) => {
                        setIcon(ws.id, name);
                        setIconEditId(null);
                      }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SettingsSection>
  );
}
