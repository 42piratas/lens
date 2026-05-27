"use client";

import { useState } from "react";
import type { TileManifest } from "@/tiles/types";
import { MEDIA_DISPLAY_OPTIONS } from "@/tiles/media-list/types";
import type { TraktConfig } from "./manifest";
import { isValidLimit, isValidSlug, isValidUsername } from "./_shared/utils";

const DISPLAY_LABELS: Record<(typeof MEDIA_DISPLAY_OPTIONS)[number], string> = {
  title: "Title",
  "title-subtitle": "+ Subtitle",
  full: "+ Cover",
  cover: "Cover only",
};

type Props = {
  config: TraktConfig;
  tile: TileManifest<TraktConfig>;
  onChange: (next: TraktConfig) => void;
};

export function ConfigBody({ config, onChange }: Props) {
  const [usernameDraft, setUsernameDraft] = useState(config.username ?? "");
  const [slugDraft, setSlugDraft] = useState(config.slug ?? "");
  const [limitDraft, setLimitDraft] = useState(String(config.limit ?? 20));

  const [prevConfig, setPrevConfig] = useState(config);
  if (prevConfig !== config) {
    setPrevConfig(config);
    if (prevConfig.username !== config.username)
      setUsernameDraft(config.username ?? "");
    if (prevConfig.slug !== config.slug) setSlugDraft(config.slug ?? "");
    if (prevConfig.limit !== config.limit)
      setLimitDraft(String(config.limit ?? 20));
  }

  const usernameError =
    usernameDraft.trim() !== "" && !isValidUsername(usernameDraft.trim());
  const slugError = slugDraft.trim() !== "" && !isValidSlug(slugDraft.trim());
  const limitNum = Number(limitDraft);
  const limitError =
    limitDraft.trim() !== "" &&
    (!Number.isFinite(limitNum) || !isValidLimit(Math.floor(limitNum)));

  const commitUsername = () => {
    const next = usernameDraft.trim() || undefined;
    if (next === config.username) return;
    if (next && !isValidUsername(next)) return;
    onChange({ ...config, username: next, listName: undefined });
  };

  const commitSlug = () => {
    const next = slugDraft.trim() || undefined;
    if (next === config.slug) return;
    if (next && !isValidSlug(next)) return;
    onChange({ ...config, slug: next, listName: undefined });
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
        <span className="tile-label">Username</span>
        <input
          type="text"
          spellCheck={false}
          value={usernameDraft}
          placeholder="42piratas"
          onChange={(e) => setUsernameDraft(e.target.value.toLowerCase())}
          onBlur={commitUsername}
          className="lens-panel-input"
          aria-invalid={usernameError ? "true" : undefined}
        />
        <span className="meta-mono lens-panel-field-helper">
          Your Trakt username — visible in your profile URL:
          trakt.tv/users/<strong>username</strong>
        </span>
        {usernameError && (
          <span className="meta-mono lens-panel-field-error">
            Invalid username — lowercase letters, digits, underscore, hyphen
          </span>
        )}
      </label>

      <label className="lens-panel-field">
        <span className="tile-label">List slug</span>
        <input
          type="text"
          spellCheck={false}
          value={slugDraft}
          placeholder="watching"
          onChange={(e) => setSlugDraft(e.target.value.toLowerCase())}
          onBlur={commitSlug}
          className="lens-panel-input"
          aria-invalid={slugError ? "true" : undefined}
        />
        <span className="meta-mono lens-panel-field-helper">
          The slug from the list URL:
          trakt.tv/users/{config.username || "username"}/lists/<strong>slug</strong>
        </span>
        {slugError && (
          <span className="meta-mono lens-panel-field-error">
            Invalid slug — lowercase letters, digits, hyphens only
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
          Number of items to show — 1 to 50.
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
