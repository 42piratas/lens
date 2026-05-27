"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { DEFAULT_WORKSPACE_ICON } from "@/lib/workspace/icons";
import { WorkspaceIconPicker } from "./WorkspaceIconPicker";

export type WorkspaceDialogMode =
  | { kind: "create" }
  | { kind: "rename"; id: string; name: string; icon: string }
  | { kind: "delete"; id: string; name: string };

export function WorkspaceDialog({
  mode,
  onClose,
  onConfirmCreate,
  onConfirmRename,
  onConfirmDelete,
}: {
  mode: WorkspaceDialogMode;
  onClose: () => void;
  onConfirmCreate: (input: { name: string; icon: string }) => void;
  onConfirmRename: (input: { name: string; icon: string }) => void;
  onConfirmDelete: () => void;
}) {
  const [name, setName] = useState(mode.kind === "rename" ? mode.name : "");
  const [icon, setIcon] = useState(
    mode.kind === "rename" ? mode.icon : DEFAULT_WORKSPACE_ICON,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isCreate = mode.kind === "create";
  const isRename = mode.kind === "rename";
  const isDelete = mode.kind === "delete";

  const submit = () => {
    if (isDelete) {
      onConfirmDelete();
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) return;
    if (isCreate) onConfirmCreate({ name: trimmed, icon });
    else if (isRename) onConfirmRename({ name: trimmed, icon });
  };

  return (
    <div className="lens-ws-dialog-backdrop" onClick={onClose}>
      <div
        className="lens-ws-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={isCreate ? "Create workspace" : isRename ? "Rename workspace" : "Delete workspace"}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lens-ws-dialog-header">
          <h2 className="lens-ws-dialog-title">
            {isCreate
              ? "New workspace"
              : isRename
                ? "Rename workspace"
                : `Delete "${mode.kind === "delete" ? mode.name : ""}"`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="lens-ws-dialog-close"
            aria-label="Close"
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        {isDelete ? (
          <div className="lens-ws-dialog-body">
            <p className="lens-ws-dialog-warning">
              This deletes the workspace and all its cards. The action can&apos;t be undone.
            </p>
          </div>
        ) : (
          <div className="lens-ws-dialog-body">
            <label className="lens-ws-dialog-field">
              <span className="lens-ws-dialog-label">Name</span>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                maxLength={80}
                placeholder="Workspace name"
                className="lens-ws-dialog-input"
              />
            </label>
            <div className="lens-ws-dialog-field">
              <span className="lens-ws-dialog-label">Icon</span>
              <WorkspaceIconPicker selected={icon} onSelect={setIcon} />
            </div>
          </div>
        )}

        <div className="lens-ws-dialog-footer">
          <button type="button" onClick={onClose} className="lens-ws-dialog-btn lens-ws-dialog-btn--ghost">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!isDelete && !name.trim()}
            className={
              isDelete
                ? "lens-ws-dialog-btn lens-ws-dialog-btn--danger"
                : "lens-ws-dialog-btn lens-ws-dialog-btn--primary"
            }
          >
            {isCreate ? "Create" : isRename ? "Save" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
