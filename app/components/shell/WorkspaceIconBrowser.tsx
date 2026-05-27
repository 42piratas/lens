"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { allLucideIconNames } from "@/lib/workspace/icons";
import { WorkspaceIcon } from "./WorkspaceIcon";

/**
 * Full lucide icon browser — ~2000 names with search filter.
 *
 * No JS virtualization — the grid renders all icons natively (each icon is
 * a small inline SVG; total payload ~80KB). An earlier attempt at CSS
 * `content-visibility: auto` virtualization left phantom row-heights on
 * filter; removing it produced a cleaner layout for the same perf cost.
 */
export function WorkspaceIconBrowser({
  selected,
  onSelect,
  onClose,
}: {
  selected: string;
  onSelect: (name: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = allLucideIconNames();
    if (!q) return all;
    return all.filter((n) => n.includes(q));
  }, [query]);

  return (
    <div className="lens-ws-icon-browse-backdrop" onClick={onClose}>
      <div
        className="lens-ws-icon-browse"
        role="dialog"
        aria-modal="true"
        aria-label="Browse all icons"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lens-ws-icon-browse-header">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search icons…"
            className="lens-ws-icon-browse-search"
            aria-label="Search icons"
          />
          <span className="lens-ws-icon-browse-count">
            {filtered.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="lens-ws-icon-browse-close"
            aria-label="Close"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
        <div className="lens-ws-icon-browse-grid" role="radiogroup" aria-label="All lucide icons">
          {filtered.map((name) => (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={name === selected}
              onClick={() => onSelect(name)}
              className="lens-ws-icon-browse-item"
              data-active={name === selected ? "true" : undefined}
              title={name}
              aria-label={name}
            >
              <WorkspaceIcon name={name} size={16} />
            </button>
          ))}
          {filtered.length === 0 ? (
            <div className="lens-ws-icon-browse-empty">No icons match.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
