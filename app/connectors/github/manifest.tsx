import { GitPullRequest } from "lucide-react";
import { z } from "zod";
import type { ConnectorManifest } from "../types";
import { ConfigBody } from "./config";

export const ConfigSchema = z.object({
  // prs mode
  prFilter: z
    .enum(["assigned", "review-requested", "authored", "involves-me"])
    .optional(),
  // issues mode
  repo: z.string().optional(), // "owner/name"
  org: z.string().optional(),
  state: z.enum(["open", "closed", "all"]).optional(),
  labels: z.array(z.string()).optional(),
  assignee: z.string().optional(),
  // notifications mode
  notificationFilter: z
    .enum(["all", "participating", "mentions", "review-requested"])
    .optional(),
  showRead: z.boolean().optional(),
});

export type GithubConfig = z.infer<typeof ConfigSchema>;

export const manifest: ConnectorManifest<GithubConfig> = {
  id: "github",
  name: "GitHub",
  icon: <GitPullRequest size={16} strokeWidth={1.75} aria-hidden />,
  description: "PRs, issues, and notifications — read-only, you pick the repos.",
  auth: {
    envVars: ["GITHUB_APP_CLIENT_ID", "GITHUB_APP_CLIENT_SECRET", "GITHUB_APP_SLUG"],
    setupDoc: "./README.md",
  },
  configSchema: ConfigSchema,
  defaultConfig: () => ({
    prFilter: "involves-me",
    state: "open",
    notificationFilter: "all",
    showRead: false,
  }),
  tiles: ["gh-pr-list", "gh-issue-list", "gh-notification-list"],
  ConfigBody,
};
