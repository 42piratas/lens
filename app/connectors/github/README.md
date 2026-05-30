# GitHub connector

Read-only views of your GitHub **pull requests**, **issues**, and **notifications** — feeds three single-connector tiles. GitHub connects as a post-sign-in **connection** (you sign in with Google; GitHub is added in `/settings`), implemented as a **GitHub App** installation + user-to-server authorization.

## Why a GitHub App (not an OAuth App)

A classic OAuth App's `repo` scope is all-or-nothing: connecting would force you to grant LENS full read **+ write** access to **every** private repo. A **GitHub App** instead:

- declares **read-only** permissions up front (no write grant is ever requested), and
- lets **you pick which repositories** to expose at install time — all, or a hand-picked subset, changeable any time at <https://github.com/settings/installations>.

V1 reads exclusively through the **user-to-server token**, which is itself bounded by the App's read-only permissions and your selected repos — so there is **no private key / JWT minting** in LENS.

## Operator setup (one-time)

1. Register a **GitHub App** at <https://github.com/settings/apps/new>.
   - **Permissions (all read-only):** Repository → *Pull requests: Read-only*, *Issues: Read-only*, *Metadata: Read-only* (mandatory), *Contents: No access*; Account → *Notifications: Read-only*. Request **no** write permission.
   - **Callback URL:** `https://lens.42labs.io/api/auth/github/callback` (add `http://localhost:3000/api/auth/github/callback` for local dev).
   - **Request user authorization (OAuth) during installation:** ✅ enabled (so install + token happen in one redirect).
   - **Expire user authorization tokens:** ❌ disabled (V1 uses a long-lived user token; no refresh round-trip).
   - **Webhook:** disabled (no realtime push in V1 — 60s poll).
2. From the App's settings page, copy the **Client ID** and generate a **Client secret**, and note the App's **slug** (the `…/apps/<slug>` part of its public URL). Put them in `app/.env.local`:

   ```
   GITHUB_APP_CLIENT_ID=<client id>
   GITHUB_APP_CLIENT_SECRET=<client secret>
   GITHUB_APP_SLUG=<app slug>
   ```

   Add the same three to the Vercel project env for the deployed instance.
3. In LENS → `/settings` → Connections → **GitHub** → **Connect**. You'll install the App (picking repos) and authorize in one step, then land back on `/settings`.

## Modes

| Tile | Config | Notes |
|:--|:--|:--|
| `gh-pr-list` | filter (`involves-me` default / `assigned` / `review-requested` / `authored`) + optional `repo` | Rows show `repo #n · title · CI-status dot · age`. Status from the PR's `statusCheckRollup` (same GraphQL query, no extra round-trip). |
| `gh-issue-list` | `repo` (`owner/name`) **or** `org` + state (open/closed/all) + labels + assignee | A repo you didn't add to the installation renders a friendly "repo not in your GitHub connection" pill. |
| `gh-notification-list` | filter (all / participating / mentions / review-requested) + show-read toggle | Inbox of unread notifications. **REST** (`GET /notifications`) — GitHub's GraphQL API has no notifications inbox. |

All reads are bounded to the repos you selected at install. 60s in-memory server cache keyed by `(userId, mode, filters)`.

## Module layout

| File | Purpose |
|:--|:--|
| `manifest.tsx` | Connector declaration — three tiles, three env vars |
| `auth.ts` | `readGithubToken()` — per-user token via `readOAuthTokens({ provider: "github" })` |
| `client.ts` | Server-only — GraphQL (PRs + issues) + REST (notifications) + 60s cache + error mapping |
| `types.ts` | `GhPullRequest`, `GhIssue`, `GhNotification`, `GhViewer`, filter/state unions |
| `config.tsx` | Universal-panel body — per-tile config form |
| `_shared/states.tsx` | Skeleton / empty / unconfigured / error pill (incl. the not-found pill) |
| `_shared/utils.ts` | `relativeAge`, repo/owner validators, CI-status → DS class |
| `hooks/use-github-*.ts` | TanStack Query hooks over `/api/github/{prs,issues,notifications}` |
| `api/{prs,issues,notifications}/route.ts` | `authedRoute`-wrapped GET handlers |
| `__tests__/` | client mapping/cache/not-found + route auth/error-envelope |

The connect flow lives outside the connector folder (it's an auth concern): `app/api/auth/github/{start,callback}/route.ts`. The provider CHECK constraint is widened in `supabase/migrations/0004_github_oauth_provider.sql`.

## Error envelope

Same `IntegrationError` shape as the other connectors:

| HTTP | Kind | Pill |
|:--|:--|:--|
| 401 | `auth` | "GitHub not connected — connect in Settings" |
| 403 + `X-RateLimit-Remaining: 0` / 429 | `rate-limit` | "GitHub rate-limited — retry in Nm" |
| 404 / GraphQL `NOT_FOUND` | `not-found` | "Repo not in your GitHub connection" |
| 5xx / fetch failure | `network` | "Network error" |

## Rate limits

Authenticated requests: 5000/hr (REST) and 5000 points/hr (GraphQL) per user. The 60s cache keeps a single tile well under the cap.

## What V1 does NOT do

- Write actions (merge / comment / mark-as-read / close) — would need write permissions + re-consent.
- Installation tokens / JWT minting (acting as the App with no user present) — deferred until webhooks/background work needs them.
- GitHub Enterprise Server (`api.github.com` only), Projects/Discussions/Releases views, realtime webhooks, multi-account GitHub.
