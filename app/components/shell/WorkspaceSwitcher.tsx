"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Copy, Trash2, Image as ImageIcon } from "lucide-react";
import { useWorkspaceStore } from "@/lib/workspace/store";
import { WorkspaceIcon } from "./WorkspaceIcon";
import { WorkspaceDialog, type WorkspaceDialogMode } from "./WorkspaceDialog";

type ContextMenu = { id: string; x: number; y: number };

export function WorkspaceSwitcher() {
  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeId = useWorkspaceStore((s) => s.activeId);
  const switchTo = useWorkspaceStore((s) => s.switchTo);
  const create = useWorkspaceStore((s) => s.create);
  const duplicate = useWorkspaceStore((s) => s.duplicate);
  const rename = useWorkspaceStore((s) => s.rename);
  const setIcon = useWorkspaceStore((s) => s.setIcon);
  const remove = useWorkspaceStore((s) => s.remove);

  const [menu, setMenu] = useState<ContextMenu | null>(null);
  const [dialog, setDialog] = useState<WorkspaceDialogMode | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  useEffect(() => {
    if (!menu) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const onContext = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setMenu({ id, x: e.clientX, y: e.clientY });
  };

  if (!hydrated) return null;

  const menuTarget = menu ? workspaces.find((w) => w.id === menu.id) : null;

  return (
    <>
      <div className="lens-ws-switcher" aria-label="Workspaces">
        <button
          type="button"
          onClick={() => setDialog({ kind: "create" })}
          title="New workspace"
          aria-label="New workspace"
          className="lens-dock-btn lens-ws-btn lens-ws-btn--add"
        >
          <Plus size={18} strokeWidth={1.75} aria-hidden />
        </button>
        {workspaces.map((ws) => (
          <button
            key={ws.id}
            type="button"
            onClick={() => switchTo(ws.id)}
            onContextMenu={(e) => onContext(e, ws.id)}
            title={ws.name}
            aria-label={ws.name}
            aria-pressed={ws.id === activeId}
            className="lens-dock-btn lens-ws-btn"
            data-active={ws.id === activeId ? "true" : undefined}
          >
            <WorkspaceIcon name={ws.icon} size={18} />
          </button>
        ))}
      </div>

      {menu && menuTarget && (
        <div
          ref={menuRef}
          className="lens-ws-context-menu"
          role="menu"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setDialog({
                kind: "rename",
                id: menuTarget.id,
                name: menuTarget.name,
                icon: menuTarget.icon,
              });
              setMenu(null);
            }}
            className="lens-ws-context-menu-item"
          >
            <Pencil size={14} aria-hidden /> Rename
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setDialog({
                kind: "rename",
                id: menuTarget.id,
                name: menuTarget.name,
                icon: menuTarget.icon,
              });
              setMenu(null);
            }}
            className="lens-ws-context-menu-item"
          >
            <ImageIcon size={14} aria-hidden /> Change icon
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              duplicate(menuTarget.id);
              setMenu(null);
            }}
            className="lens-ws-context-menu-item"
          >
            <Copy size={14} aria-hidden /> Duplicate
          </button>
          <div className="lens-ws-context-menu-sep" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setDialog({
                kind: "delete",
                id: menuTarget.id,
                name: menuTarget.name,
              });
              setMenu(null);
            }}
            disabled={workspaces.length <= 1}
            className="lens-ws-context-menu-item lens-ws-context-menu-item--danger"
          >
            <Trash2 size={14} aria-hidden /> Delete
          </button>
        </div>
      )}

      {dialog && (
        <WorkspaceDialog
          mode={dialog}
          onClose={() => setDialog(null)}
          onConfirmCreate={(input) => {
            create(input);
            setDialog(null);
          }}
          onConfirmRename={(input) => {
            if (dialog.kind === "rename") {
              if (input.name !== dialog.name) rename(dialog.id, input.name);
              if (input.icon !== dialog.icon) setIcon(dialog.id, input.icon);
            }
            setDialog(null);
          }}
          onConfirmDelete={() => {
            if (dialog.kind === "delete") remove(dialog.id);
            setDialog(null);
          }}
        />
      )}
    </>
  );
}
