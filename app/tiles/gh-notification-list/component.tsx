"use client";

import {
  Bell,
  CircleDot,
  GitCommit,
  GitPullRequest,
  MessagesSquare,
  Tag,
} from "lucide-react";
import type { ComponentType } from "react";
import type { LayoutCard } from "@/connectors/types";
import type { GithubConfig } from "@/connectors/github/manifest";
import type { GhNotificationType } from "@/connectors/github/types";
import { useGithubNotifications } from "@/connectors/github/hooks/use-github-notifications";
import {
  GithubEmpty,
  GithubErrorPill,
  GithubSkeleton,
} from "@/connectors/github/_shared/states";
import { relativeAge } from "@/connectors/github/_shared/utils";

const TYPE_ICON: Record<GhNotificationType, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  PullRequest: GitPullRequest,
  Issue: CircleDot,
  Commit: GitCommit,
  Release: Tag,
  Discussion: MessagesSquare,
  Other: Bell,
};

function reasonLabel(reason: string): string {
  return reason.replace(/_/g, " ");
}

export function GithubNotificationListTile({
  card,
}: {
  card: LayoutCard<GithubConfig>;
}) {
  const filter = card.config.notificationFilter ?? "all";
  const showRead = Boolean(card.config.showRead);
  const { data, isLoading, error } = useGithubNotifications({ filter, showRead });

  if (isLoading) return <GithubSkeleton />;
  if (error) return <GithubErrorPill error={error} />;
  if (!data || data.length === 0) return <GithubEmpty hint="No notifications" />;

  return (
    <div className="lens-gh-list">
      {data.map((n) => {
        const Icon = TYPE_ICON[n.type];
        const inner = (
          <>
            <span className="lens-gh-notif-icon" aria-hidden>
              <Icon size={13} strokeWidth={1.75} />
            </span>
            <div className="lens-gh-row-main">
              <span className="meta-mono lens-gh-repo">{n.repo}</span>
              <span className="lens-gh-title" data-unread={n.unread ? "true" : undefined}>
                {n.title}
              </span>
            </div>
            <div className="lens-gh-row-meta">
              <span className="meta-mono lens-gh-reason">{reasonLabel(n.reason)}</span>
              <span className="meta-mono lens-gh-age">{relativeAge(n.updatedAt)}</span>
            </div>
          </>
        );
        return n.url ? (
          <a
            key={n.id}
            href={n.url}
            target="_blank"
            rel="noreferrer"
            className="lens-gh-row lens-gh-row--notif"
          >
            {inner}
          </a>
        ) : (
          <div key={n.id} className="lens-gh-row lens-gh-row--notif">
            {inner}
          </div>
        );
      })}
    </div>
  );
}
