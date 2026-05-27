"use client";

import { useState } from "react";
import { WORKSPACE_QUICK_PICK_ICONS } from "@/lib/workspace/icons";
import { WorkspaceIcon } from "./WorkspaceIcon";
import { WorkspaceIconBrowser } from "./WorkspaceIconBrowser";

export function WorkspaceIconPicker({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (name: string) => void;
}) {
  const [browseOpen, setBrowseOpen] = useState(false);
  return (
    <>
      <div className="lens-ws-icon-picker" role="radiogroup" aria-label="Workspace icon">
        {WORKSPACE_QUICK_PICK_ICONS.map((name) => (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={name === selected}
            onClick={() => onSelect(name)}
            className="lens-ws-icon-picker-item"
            data-active={name === selected ? "true" : undefined}
            title={name}
            aria-label={name}
          >
            <WorkspaceIcon name={name} size={16} />
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setBrowseOpen(true)}
        className="lens-ws-icon-picker-browse"
        aria-label="Browse all icons"
      >
        Browse all icons…
      </button>
      {browseOpen ? (
        <WorkspaceIconBrowser
          selected={selected}
          onSelect={(name) => {
            onSelect(name);
            setBrowseOpen(false);
          }}
          onClose={() => setBrowseOpen(false)}
        />
      ) : null}
    </>
  );
}
