export type GhStatus = "success" | "failure" | "pending" | "unknown";

export type GhPullRequest = {
  id: string;
  number: number;
  title: string;
  url: string;
  repo: string; // "owner/name"
  author: string;
  isDraft: boolean;
  status: GhStatus; // rolled-up CI status
  updatedAt: string; // ISO
};

export type GhLabel = {
  name: string;
  /** GitHub-supplied hex (external-data color — allowed to flow into style). */
  color: string;
};

export type GhIssue = {
  id: string;
  number: number;
  title: string;
  url: string;
  repo: string;
  state: "open" | "closed";
  labels: GhLabel[];
  assignees: string[];
  updatedAt: string;
};

export type GhNotificationType =
  | "PullRequest"
  | "Issue"
  | "Commit"
  | "Release"
  | "Discussion"
  | "Other";

export type GhNotification = {
  id: string;
  type: GhNotificationType;
  title: string;
  repo: string;
  reason: string; // raw GitHub reason (e.g. "mention", "review_requested")
  url: string | null; // best-effort html url
  unread: boolean;
  updatedAt: string;
};

export type GhViewer = { login: string; avatarUrl: string };

export type GhPrFilter =
  | "assigned"
  | "review-requested"
  | "authored"
  | "involves-me";

export type GhIssueState = "open" | "closed" | "all";

export type GhNotificationFilter =
  | "all"
  | "participating"
  | "mentions"
  | "review-requested";

export { IntegrationError } from "../_shared/integration-error";
export type { IntegrationErrorKind } from "../_shared/integration-error";
