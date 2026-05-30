"use client";

import { useState } from "react";
import type { TileManifest } from "@/tiles/types";
import type { GithubConfig } from "./manifest";
import { isValidOwner, isValidRepo } from "./_shared/utils";

type Props = {
  config: GithubConfig;
  tile: TileManifest<GithubConfig>;
  onChange: (next: GithubConfig) => void;
};

const PR_FILTERS: Array<{ value: NonNullable<GithubConfig["prFilter"]>; label: string }> = [
  { value: "involves-me", label: "Involves me" },
  { value: "assigned", label: "Assigned" },
  { value: "review-requested", label: "Review" },
  { value: "authored", label: "Authored" },
];

const STATES: Array<{ value: NonNullable<GithubConfig["state"]>; label: string }> = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
];

const NOTIF_FILTERS: Array<{
  value: NonNullable<GithubConfig["notificationFilter"]>;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "participating", label: "Participating" },
  { value: "mentions", label: "Mentions" },
  { value: "review-requested", label: "Review" },
];

export function ConfigBody({ config, tile, onChange }: Props) {
  if (tile.id === "gh-pr-list") return <PrConfig config={config} onChange={onChange} />;
  if (tile.id === "gh-issue-list") return <IssueConfig config={config} onChange={onChange} />;
  return <NotificationConfig config={config} onChange={onChange} />;
}

function PrConfig({
  config,
  onChange,
}: {
  config: GithubConfig;
  onChange: (next: GithubConfig) => void;
}) {
  const [repoDraft, setRepoDraft] = useState(config.repo ?? "");
  const repoError = repoDraft.trim() !== "" && !isValidRepo(repoDraft.trim());
  const filter = config.prFilter ?? "involves-me";

  const commitRepo = () => {
    const next = repoDraft.trim() || undefined;
    if (next === config.repo) return;
    if (next && !isValidRepo(next)) return;
    onChange({ ...config, repo: next });
  };

  return (
    <div className="lens-panel-fields">
      <label className="lens-panel-field">
        <span className="tile-label">Filter</span>
        <div className="lens-panel-segmented">
          {PR_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className="lens-panel-segmented-btn"
              data-active={filter === f.value ? "true" : undefined}
              aria-pressed={filter === f.value}
              onClick={() => onChange({ ...config, prFilter: f.value })}
            >
              {f.label}
            </button>
          ))}
        </div>
      </label>

      <label className="lens-panel-field">
        <span className="tile-label">Repo (optional)</span>
        <input
          type="text"
          spellCheck={false}
          value={repoDraft}
          placeholder="owner/name — leave blank for all your repos"
          onChange={(e) => setRepoDraft(e.target.value)}
          onBlur={commitRepo}
          className="lens-panel-input"
          aria-invalid={repoError ? "true" : undefined}
        />
        <span className="meta-mono lens-panel-field-helper">
          Limit to one repo, or leave blank to span every repo you added to the
          GitHub connection.
        </span>
        {repoError && (
          <span className="meta-mono lens-panel-field-error">
            Use the form owner/name
          </span>
        )}
      </label>
    </div>
  );
}

function IssueConfig({
  config,
  onChange,
}: {
  config: GithubConfig;
  onChange: (next: GithubConfig) => void;
}) {
  const usingOrg = Boolean(config.org) && !config.repo;
  const [repoDraft, setRepoDraft] = useState(config.repo ?? "");
  const [orgDraft, setOrgDraft] = useState(config.org ?? "");
  const [labelsDraft, setLabelsDraft] = useState((config.labels ?? []).join(", "));
  const [assigneeDraft, setAssigneeDraft] = useState(config.assignee ?? "");
  const state = config.state ?? "open";

  const repoError = repoDraft.trim() !== "" && !isValidRepo(repoDraft.trim());
  const orgError = orgDraft.trim() !== "" && !isValidOwner(orgDraft.trim());

  const commitRepo = () => {
    const next = repoDraft.trim() || undefined;
    if (next && !isValidRepo(next)) return;
    onChange({ ...config, repo: next, org: undefined });
  };
  const commitOrg = () => {
    const next = orgDraft.trim() || undefined;
    if (next && !isValidOwner(next)) return;
    onChange({ ...config, org: next, repo: undefined });
  };
  const commitLabels = () => {
    const parsed = labelsDraft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    onChange({ ...config, labels: parsed.length ? parsed : undefined });
  };
  const commitAssignee = () => {
    const next = assigneeDraft.trim() || undefined;
    onChange({ ...config, assignee: next });
  };

  return (
    <div className="lens-panel-fields">
      <label className="lens-panel-field">
        <span className="tile-label">Source</span>
        <div className="lens-panel-segmented">
          <button
            type="button"
            className="lens-panel-segmented-btn"
            data-active={!usingOrg ? "true" : undefined}
            onClick={() => onChange({ ...config, org: undefined })}
          >
            Repo
          </button>
          <button
            type="button"
            className="lens-panel-segmented-btn"
            data-active={usingOrg ? "true" : undefined}
            onClick={() => onChange({ ...config, repo: undefined, org: orgDraft.trim() || config.org })}
          >
            Org
          </button>
        </div>
      </label>

      {!usingOrg ? (
        <label className="lens-panel-field">
          <span className="tile-label">Repository</span>
          <input
            type="text"
            spellCheck={false}
            value={repoDraft}
            placeholder="owner/name"
            onChange={(e) => setRepoDraft(e.target.value)}
            onBlur={commitRepo}
            className="lens-panel-input"
            aria-invalid={repoError ? "true" : undefined}
          />
          {repoError && (
            <span className="meta-mono lens-panel-field-error">
              Use the form owner/name
            </span>
          )}
        </label>
      ) : (
        <label className="lens-panel-field">
          <span className="tile-label">Organization</span>
          <input
            type="text"
            spellCheck={false}
            value={orgDraft}
            placeholder="my-org"
            onChange={(e) => setOrgDraft(e.target.value)}
            onBlur={commitOrg}
            className="lens-panel-input"
            aria-invalid={orgError ? "true" : undefined}
          />
          {orgError && (
            <span className="meta-mono lens-panel-field-error">
              Invalid org name
            </span>
          )}
        </label>
      )}

      <label className="lens-panel-field">
        <span className="tile-label">State</span>
        <div className="lens-panel-segmented">
          {STATES.map((s) => (
            <button
              key={s.value}
              type="button"
              className="lens-panel-segmented-btn"
              data-active={state === s.value ? "true" : undefined}
              onClick={() => onChange({ ...config, state: s.value })}
            >
              {s.label}
            </button>
          ))}
        </div>
      </label>

      <label className="lens-panel-field">
        <span className="tile-label">Labels</span>
        <input
          type="text"
          spellCheck={false}
          value={labelsDraft}
          placeholder="bug, p1 (comma-separated)"
          onChange={(e) => setLabelsDraft(e.target.value)}
          onBlur={commitLabels}
          className="lens-panel-input"
        />
      </label>

      <label className="lens-panel-field">
        <span className="tile-label">Assignee</span>
        <input
          type="text"
          spellCheck={false}
          value={assigneeDraft}
          placeholder="github-login (optional)"
          onChange={(e) => setAssigneeDraft(e.target.value)}
          onBlur={commitAssignee}
          className="lens-panel-input"
        />
      </label>
    </div>
  );
}

function NotificationConfig({
  config,
  onChange,
}: {
  config: GithubConfig;
  onChange: (next: GithubConfig) => void;
}) {
  const filter = config.notificationFilter ?? "all";
  const showRead = Boolean(config.showRead);
  return (
    <div className="lens-panel-fields">
      <label className="lens-panel-field">
        <span className="tile-label">Filter</span>
        <div className="lens-panel-segmented">
          {NOTIF_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className="lens-panel-segmented-btn"
              data-active={filter === f.value ? "true" : undefined}
              onClick={() => onChange({ ...config, notificationFilter: f.value })}
            >
              {f.label}
            </button>
          ))}
        </div>
      </label>

      <label className="lens-panel-field lens-panel-field--row">
        <span className="tile-label">Show read</span>
        <input
          type="checkbox"
          checked={showRead}
          onChange={(e) => onChange({ ...config, showRead: e.target.checked })}
        />
      </label>
    </div>
  );
}
