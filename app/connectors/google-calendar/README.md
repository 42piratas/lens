# Google Calendar connector

Google Calendar views (Today / Week / Month / Macro) plus cross-tile event-tagging (b02-05 Plugins) backed by a single-user OAuth refresh token in `.env.local`. Multi-user sign-in lands later in Phase 2 (b02-15 Auth).

The token requires both **`calendar.readonly`** (for the calendar-list dropdown) and **`calendar.events`** (write events) from b02-05 onward — read-only tokens reject the b02-05 PATCH path with 401.

## Required env vars

Set in `app/.env.local` (never commit):

```
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_CALENDAR_REFRESH_TOKEN=...
```

The dev server reads these at runtime via `process.env`. Missing any one throws an `IntegrationError("auth")` and the cards render the "Sign-in expired" pill.

## One-time operator setup

1. **Google Cloud Console** — create (or reuse) an OAuth 2.0 Client ID, type **Web application**.
   - Authorized redirect URI: `http://localhost:53682/callback`
   - Enable the **Google Calendar API** on the project.
2. Required OAuth scopes: `https://www.googleapis.com/auth/calendar.readonly` (calendar list + read events) and `https://www.googleapis.com/auth/calendar.events` (write events — b02-05 onward). Both ship as `scripts/google-oauth.mjs` defaults.
3. Copy the client id + secret into `app/.env.local`.
4. Generate a refresh token:

   ```
   cd app
   GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=... node scripts/google-oauth.mjs
   ```

   The helper prints an authorization URL, captures the redirect on `localhost:53682`, exchanges the code, and prints `GOOGLE_CALENDAR_REFRESH_TOKEN=...` to stdout.
5. Paste the refresh token line into `app/.env.local` and restart `pnpm dev`.

If Google returns `no refresh_token`, revoke prior consent at <https://myaccount.google.com/permissions> and rerun.

### Re-issuing the token to upgrade scope

If you previously issued a read-only token (`calendar.readonly` only) and want to upgrade to include `calendar.events`:

1. Revoke prior consent at <https://myaccount.google.com/permissions>.
2. Re-run `node scripts/google-oauth.mjs` — defaults now request `calendar.readonly` + `calendar.events` + `spreadsheets.readonly` + `tasks.readonly`.
3. Replace `GOOGLE_CALENDAR_REFRESH_TOKEN` in `.env.local` with the new value.

Test the new token end-to-end by dragging a Sheets `badges-with-descriptions` row onto a Calendar `calendar-one-day` tile — the next upcoming event should pick up the new colorId + description prefix (verify on `calendar.google.com`).

## Module layout

```
connectors/google-calendar/
├─ manifest.tsx          # registry entry: 4 modes, env-vars, ConfigBody
├─ auth.ts               # server-only refresh-token → access-token (TTL cache)
├─ client.ts             # server-only listCalendars / listEvents (60s in-memory cache)
├─ types.ts              # CalendarSummary, NormalizedEvent, IntegrationError
├─ dates.ts              # startOfWeek, rangeForView, addDays, diffDays
├─ config.tsx            # ConfigBody — calendar dropdown + per-mode options
├─ hooks/
│  ├─ use-calendars.ts        # @tanstack/react-query wrapper for /api/google/calendar/calendars
│  └─ use-calendar-events.ts  # …/events?calendarId&timeMin&timeMax
├─ modes/
│  ├─ today.tsx          # hour-by-hour with now-line
│  ├─ week.tsx           # 7-day grid
│  ├─ month.tsx          # month grid with event dots
│  └─ macro.tsx          # multi-week density bars
├─ _shared/
│  ├─ states.tsx         # CalendarSkeleton + CalendarErrorPill
│  └─ utils.ts           # eventColor, packTracks, groupByDay, etc.
└─ __tests__/            # client + dates
```

The two route handlers at `app/api/google/calendar/{calendars,events}/route.ts` wrap `listCalendars` / `listEvents` (GET) and `patchEvent` (PATCH on `events`) so client-side hooks and payload adapters never touch the server-only module directly.

## Plugins — `tag-like` payload acceptor (b02-05)

The Calendar connector accepts cross-tile `tag-like` payloads on the `calendar-one-day` tile only — drag a Sheets `badges-with-descriptions` row onto Today and the next upcoming event picks up:

- **`colorId`** — the payload's `--label-*` semantic name maps to Google's 1–11 fixed palette (`blue` → `1` Lavender, `green` → `2` Sage, `purple` → `3` Grape, `red` / `pink` → `4` Flamingo, `yellow` → `5` Banana, `orange` → `6` Tangerine, `sky` → `7` Peacock, `black` → `8` Graphite, `lime` → `10` Basil). Unmapped colors leave `colorId` untouched.
- **Description prefix** — `[<name>] <description>` (or just `[<name>]`) is prepended to the existing event description; idempotent (skipped if the prefix is already present).

Out of scope for v1: applying the tag to multiple events, picking by hover, week / month / macro tile drops. Forward work.

The adapter routes through the optimistic-write retry queue (`lib/dnd-payloads/pending-writes.ts`) — UI returns immediately, worker drains with backoff (1s / 5s / 30s / 5m), permanent 401s surface the inline reconnect pill.

## Limits

- 60-second in-memory cache on both `listCalendars` and `listEvents`.
- `listEvents` caps at `maxResults: 2500` per range — big calendars over long macro windows may truncate.
- All four modes silently render the empty state when no calendar is picked. The "Pick a calendar — gear icon" hint nudges first-time users.
