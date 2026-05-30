"use client";

import type { LayoutCard } from "@/connectors/types";
import type { GithubConfig } from "@/connectors/github/manifest";
import { useGithubPrs } from "@/connectors/github/hooks/use-github-prs";
import {
  GithubEmpty,
  GithubErrorPill,
  GithubSkeleton,
} from "@/connectors/github/_shared/states";
import {
  relativeAge,
  statusLabel,
  statusModifier,
} from "@/connectors/github/_shared/utils";

export function GithubPrListTile({ card }: { card: LayoutCard<GithubConfig> }) {
  const filter = card.config.prFilter ?? "involves-me";
  const repo = card.config.repo;
  const { data, isLoading, error } = useGithubPrs({ filter, repo });

  if (isLoading) return <GithubSkeleton />;
  if (error) return <GithubErrorPill error={error} />;
  if (!data || data.length === 0) return <GithubEmpty hint="No pull requests" />;

  return (
    <div className="lens-gh-list">
      {data.map((pr) => (
        <a
          key={pr.id}
          href={pr.url}
          target="_blank"
          rel="noreferrer"
          className="lens-gh-row"
        >
          <div className="lens-gh-row-main">
            <span className="meta-mono lens-gh-repo">
              {pr.repo} #{pr.number}
            </span>
            <span className="lens-gh-title">
              {pr.isDraft ? "[draft] " : ""}
              {pr.title}
            </span>
          </div>
          <div className="lens-gh-row-meta">
            <span
              className={`lens-gh-status ${statusModifier(pr.status)}`}
              title={statusLabel(pr.status)}
              aria-label={statusLabel(pr.status)}
            />
            <span className="meta-mono lens-gh-age">{relativeAge(pr.updatedAt)}</span>
          </div>
        </a>
      ))}
    </div>
  );
}
