"use client";

import type { LayoutCard } from "@/connectors/types";
import type { GithubConfig } from "@/connectors/github/manifest";
import { useGithubIssues } from "@/connectors/github/hooks/use-github-issues";
import {
  GithubEmpty,
  GithubErrorPill,
  GithubSkeleton,
  GithubUnconfigured,
} from "@/connectors/github/_shared/states";
import { relativeAge } from "@/connectors/github/_shared/utils";

export function GithubIssueListTile({ card }: { card: LayoutCard<GithubConfig> }) {
  const { repo, org, state, labels, assignee } = card.config;
  const configured = Boolean(repo || org);
  const { data, isLoading, error } = useGithubIssues(
    { repo, org, state, labels, assignee },
    configured,
  );

  if (!configured) return <GithubUnconfigured hint="Pick a repo or org — gear icon" />;
  if (isLoading) return <GithubSkeleton />;
  if (error) return <GithubErrorPill error={error} />;
  if (!data || data.length === 0) return <GithubEmpty hint="No issues" />;

  return (
    <div className="lens-gh-list">
      {data.map((issue) => (
        <a
          key={issue.id}
          href={issue.url}
          target="_blank"
          rel="noreferrer"
          className="lens-gh-row"
        >
          <div className="lens-gh-row-main">
            <span className="meta-mono lens-gh-repo">
              {issue.repo} #{issue.number}
            </span>
            <span className="lens-gh-title">{issue.title}</span>
            {issue.labels.length > 0 && (
              <div className="lens-gh-labels">
                {issue.labels.map((l) => (
                  <span key={l.name} className="lens-gh-label">
                    {l.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="lens-gh-row-meta">
            {issue.assignees.length > 0 && (
              <span className="meta-mono lens-gh-assignee">@{issue.assignees[0]}</span>
            )}
            <span className="meta-mono lens-gh-age">{relativeAge(issue.updatedAt)}</span>
          </div>
        </a>
      ))}
    </div>
  );
}
