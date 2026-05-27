# Google Tasks connector

Read-only Google Tasks views (single tasklist or cross-list due window) backed by a single-user OAuth refresh token in `.env.local`. Multi-user sign-in lands later in Phase 2 (b02-06 Auth).

## Required env vars

Set in `app/.env.local` (never commit):

```
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_CALENDAR_REFRESH_TOKEN=...
```

The refresh-token env-var name **`GOOGLE_CALENDAR_REFRESH_TOKEN`** is shared with Calendar + Sheets by design — one token covers all enabled Google scopes. Preserved through Phase 2; b02-06 (multi-user auth) replaces env-var tokens entirely with per-user OAuth in Supabase.

Required Google OAuth scope: `https://www.googleapis.com/auth/tasks.readonly`. The default invocation of `scripts/google-oauth.mjs` requests Calendar + Sheets + Tasks read scopes together.

## One-time operator setup

If you already followed the Calendar / Sheets setup, only step 4 changes — re-run the OAuth helper to issue a fresh refresh token covering the new scope.

1. **Google Cloud Console** — same OAuth client as Calendar + Sheets. Enable the **Google Tasks API** on the project.
2. Required scope: `https://www.googleapis.com/auth/tasks.readonly`.
3. Client id + secret already in `.env.local` (shared with Calendar + Sheets).
4. Re-issue the refresh token with all three scopes:

   ```
   cd app
   node scripts/google-oauth.mjs
   ```

   The default scope set is **Calendar + Sheets + Tasks readonly**. Override with:

   ```
   node scripts/google-oauth.mjs --scopes=https://www.googleapis.com/auth/tasks.readonly
   ```

5. Paste the new `GOOGLE_CALENDAR_REFRESH_TOKEN=…` line into `app/.env.local`, replacing the prior value, and restart `pnpm dev`.

If Google returns `no refresh_token`, revoke prior consent at <https://myaccount.google.com/permissions> and rerun.

## Module layout

```
connectors/google-tasks/
├─ manifest.tsx          # registry entry: 2 modes (list, due), env-vars, ConfigBody
├─ auth.ts               # re-exports the shared Google OAuth helper
├─ client.ts             # server-only listTasklists / listTasks / listTasksAcrossAll (60s cache)
├─ types.ts              # Tasklist, Task, IntegrationError re-exports
├─ config.tsx            # ConfigBody — tasklist picker + per-mode options
├─ hooks/
│  ├─ use-tasklists.ts   # @tanstack/react-query — /api/google/tasks/tasklists
│  ├─ use-tasks-list.ts  # …/list?tasklistId&showCompleted&showHidden
│  └─ use-tasks-due.ts   # …/due?lookaheadDays&showHidden
├─ modes/
│  ├─ list.tsx           # Single tasklist, vertical stack, completed → struck-through
│  └─ due.tsx            # Cross-list, due-date sorted ascending, tasklist caption per row
├─ _shared/
│  ├─ states.tsx         # TasksSkeleton, TasksErrorPill, TasksUnconfigured
│  └─ utils.ts           # formatDueShort, isPastDue, clamp
└─ __tests__/            # client + utils
```

The shared OAuth helper at `app/connectors/_shared/google-oauth.ts` is imported by Calendar, Sheets, and Tasks — token refresh + caching is not duplicated.

The three route handlers at `app/app/api/google/tasks/{tasklists,list,due}/route.ts` wrap the server-only client so the React-Query hooks never touch the server-only module directly.

## Limits

- 60-second in-memory cache on `listTasklists` and `listTasks`.
- `due` mode aggregates by fetching every tasklist's tasks within the window in parallel; a heavy cross-list query is one cache hit per list.
- `showCompleted` is per-list; the Google API exposes the same flag.
- `showHidden` is the Google API parameter — surfaces tasks marked hidden (e.g. completed-and-cleared) when on. Default off.
