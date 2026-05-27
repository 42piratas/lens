"use client";

import { useState } from "react";
import type { TileManifest } from "@/tiles/types";
import { MEDIA_DISPLAY_OPTIONS } from "@/tiles/media-list/types";
import type { GoodreadsConfig } from "./manifest";
import {
  isValidLimit,
  isValidShelf,
  isValidUserId,
} from "./_shared/utils";

const DISPLAY_LABELS: Record<(typeof MEDIA_DISPLAY_OPTIONS)[number], string> = {
  title: "Title",
  "title-subtitle": "+ Subtitle",
  full: "+ Cover",
  cover: "Cover only",
};
type Props = {
  config: GoodreadsConfig;
  tile: TileManifest<GoodreadsConfig>;
  onChange: (next: GoodreadsConfig) => void;
};

export function ConfigBody({ config, onChange }: Props) {
  const [userIdDraft, setUserIdDraft] = useState(config.userId ?? "");
  const [shelfDraft, setShelfDraft] = useState(
    config.shelfName ?? "currently-reading",
  );
  const [limitDraft, setLimitDraft] = useState(String(config.limit ?? 20));

  const [prevConfig, setPrevConfig] = useState(config);
  if (prevConfig !== config) {
    setPrevConfig(config);
    if (prevConfig.userId !== config.userId) setUserIdDraft(config.userId ?? "");
    if (prevConfig.shelfName !== config.shelfName)
      setShelfDraft(config.shelfName ?? "currently-reading");
    if (prevConfig.limit !== config.limit)
      setLimitDraft(String(config.limit ?? 20));
  }

  const userIdError =
    userIdDraft.trim() !== "" && !isValidUserId(userIdDraft.trim());
  const shelfError =
    shelfDraft.trim() !== "" && !isValidShelf(shelfDraft.trim());
  const limitNum = Number(limitDraft);
  const limitError =
    limitDraft.trim() !== "" &&
    (!Number.isFinite(limitNum) || !isValidLimit(Math.floor(limitNum)));

  const commitUserId = () => {
    const next = userIdDraft.trim() || undefined;
    if (next === config.userId) return;
    if (next && !isValidUserId(next)) return;
    onChange({ ...config, userId: next });
  };

  const commitShelf = () => {
    const next = shelfDraft.trim() || undefined;
    if (next === config.shelfName) return;
    if (next && !isValidShelf(next)) return;
    onChange({ ...config, shelfName: next });
  };

  const commitLimit = () => {
    const trimmed = limitDraft.trim();
    if (trimmed === "") {
      if (config.limit !== undefined) onChange({ ...config, limit: undefined });
      return;
    }
    const n = Math.floor(Number(trimmed));
    if (!Number.isFinite(n) || !isValidLimit(n)) return;
    if (n === config.limit) return;
    onChange({ ...config, limit: n });
  };

  return (
    <div className="lens-panel-fields">
      <label className="lens-panel-field">
        <span className="tile-label">User ID</span>
        <input
          type="text"
          inputMode="numeric"
          spellCheck={false}
          value={userIdDraft}
          placeholder="12345678"
          onChange={(e) => setUserIdDraft(e.target.value)}
          onBlur={commitUserId}
          className="lens-panel-input"
          aria-invalid={userIdError ? "true" : undefined}
        />
        <span className="meta-mono lens-panel-field-helper">
          Numeric ID — find it in your Goodreads profile URL:
          goodreads.com/user/show/<strong>12345678</strong>-name
        </span>
        {userIdError && (
          <span className="meta-mono lens-panel-field-error">
            Invalid user ID — must be numeric
          </span>
        )}
      </label>

      <label className="lens-panel-field">
        <span className="tile-label">Shelf</span>
        <input
          type="text"
          spellCheck={false}
          value={shelfDraft}
          placeholder="currently-reading"
          onChange={(e) => setShelfDraft(e.target.value.toLowerCase())}
          onBlur={commitShelf}
          className="lens-panel-input"
          aria-invalid={shelfError ? "true" : undefined}
        />
        <span className="meta-mono lens-panel-field-helper">
          Built-ins: currently-reading, read, to-read. User-defined shelves work
          too — lowercase, hyphens, no spaces.
        </span>
        {shelfError && (
          <span className="meta-mono lens-panel-field-error">
            Invalid shelf — lowercase letters, digits, hyphens only
          </span>
        )}
      </label>

      <label className="lens-panel-field">
        <span className="tile-label">Limit</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={50}
          value={limitDraft}
          placeholder="20"
          onChange={(e) => setLimitDraft(e.target.value)}
          onBlur={commitLimit}
          className="lens-panel-input"
          aria-invalid={limitError ? "true" : undefined}
        />
        <span className="meta-mono lens-panel-field-helper">
          Number of books to show — 1 to 50.
        </span>
        {limitError && (
          <span className="meta-mono lens-panel-field-error">
            Limit must be a whole number 1–50
          </span>
        )}
      </label>

      <label className="lens-panel-field">
        <span className="tile-label">Display</span>
        <div className="lens-panel-segmented">
          {MEDIA_DISPLAY_OPTIONS.map((v) => {
            const active = (config.display ?? "full") === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => onChange({ ...config, display: v })}
                aria-pressed={active}
                className="lens-panel-segmented-btn"
                data-active={active ? "true" : undefined}
              >
                {DISPLAY_LABELS[v]}
              </button>
            );
          })}
        </div>
      </label>
    </div>
  );
}
