# Google Sheets connector

Read-only Google Sheets views backed by a single-user OAuth refresh token in `.env.local`. Multi-user sign-in lands later in Phase 2 (b02-06 Auth).

The connector feeds **four tiles** today:

| Tile | Layout | Notes |
|:--|:--|:--|
| `data-table` | Range as a table | First-row-as-header toggle, optional row reversal |
| `data-stat` | Single cell as a KPI tile | Big number + small label |
| `data-chart-line` | Line chart over a 2D range (col 0 = x, cols 1+ = y series) | Theme-tokenized series colors via `--chart-1..6` |
| `badges-with-descriptions` | Two-column range — chip-styled name + description rows | Uses col 0 + col 1 only |

The chart and badges tiles are connected via the **adapter pattern** (`connectors/google-sheets/tiles/<tile-id>.tsx`). Table and stat are still single-connector and import the sheets hooks directly.

## Required env vars

Set in `app/.env.local` (never commit):

```
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_CALENDAR_REFRESH_TOKEN=...
```

The refresh-token env-var name **`GOOGLE_CALENDAR_REFRESH_TOKEN`** is shared with the Calendar + Tasks connectors by design — one token covers all enabled Google scopes. The name is preserved through Phase 2; b02-06 (multi-user auth) replaces env-var tokens entirely with per-user OAuth in Supabase, so a rename here would be migration noise.

Required Google OAuth scope: `https://www.googleapis.com/auth/spreadsheets.readonly`. The default invocation of `scripts/google-oauth.mjs` requests Calendar + Sheets + Tasks read scopes together.

## One-time operator setup

If you already followed the Calendar setup, only step 4 changes — re-run the OAuth helper to issue a fresh refresh token covering the new scope.

1. **Google Cloud Console** — same OAuth client as Calendar. Enable the **Google Sheets API** on the project.
2. Required scope: `https://www.googleapis.com/auth/spreadsheets.readonly`.
3. Client id + secret already in `.env.local` (shared with Calendar).
4. Re-issue the refresh token with all required scopes:

   ```
   cd app
   node scripts/google-oauth.mjs
   ```

   The default scope set is **Calendar + Sheets + Tasks readonly**.

5. Paste the new `GOOGLE_CALENDAR_REFRESH_TOKEN=…` line into `app/.env.local`, replacing the prior value, and restart `pnpm dev`.

If Google returns `no refresh_token`, revoke prior consent at <https://myaccount.google.com/permissions> and rerun.

## Module layout

```
connectors/google-sheets/
├─ manifest.tsx                    # registry entry: 4 tiles, env-vars, ConfigBody, tileAdapters
├─ auth.ts                         # re-exports the shared Google OAuth helper
├─ client.ts                       # server-only getRange / getCell (60s in-memory cache)
├─ types.ts                        # CellValue, RangeData, IntegrationError re-exports
├─ config.tsx                      # ConfigBody — spreadsheet ID + range/cell + label + flags
├─ hooks/
│  ├─ use-range.ts                 # @tanstack/react-query wrapper for /api/google/sheets/range
│  ├─ use-cell.ts                  # …/cell?spreadsheetId&cell
│  └─ use-sheet-metadata.ts        # …/metadata — for topbar gid resolution
├─ tiles/
│  ├─ data-chart-line.tsx          # adapter: range → ChartLineData
│  └─ badges-with-descriptions.tsx # adapter: range → BadgeItem[]
├─ _shared/
│  ├─ states.tsx                   # SheetsSkeleton, SheetsErrorPill, SheetsUnconfigured
│  ├─ topbar.tsx                   # makeSheetsTopbar — gid-resolved deep links for table/stat
│  └─ utils.ts                     # isValidSpreadsheetId, isValidA1, formatCell
└─ __tests__/                      # client + utils
```

The shared OAuth helper at `app/connectors/_shared/google-oauth.ts` is imported by Calendar / Sheets / Tasks — token refresh + caching is not duplicated.

The two route handlers at `app/api/google/sheets/{range,cell,metadata}/route.ts` wrap the server-only client functions so the client-side hooks never touch the server-only module directly.

## Cell rendering

`getRange` requests `valueRenderOption=FORMATTED_VALUE`, which means cells return as **whatever string the sheet displays**:

- A cell formatted as a date (e.g. `Jan 15, 2026`) returns the string `"Jan 15, 2026"`, not the underlying serial integer.
- A currency-formatted cell returns `"$1,234.56"`.
- An unformatted number returns the string `"1234.56"` and the client's `normalizeCell` coerces it back to a number for downstream tiles.

Downstream consumers handle this:
- `data-stat` displays the cell as-is.
- `data-table` displays each cell as-is via `formatCell`.
- `data-chart-line`'s adapter has a `coerceY` that strips thousands separators and parses numeric strings; non-numeric y values are skipped.
- `data-chart-line`'s tile component formats x-axis ticks as `MMM DD` when the value parses as a date, otherwise renders the raw string.

## Config flags shared across range tiles

Three flags on `GoogleSheetsConfig` apply to any tile that reads a range (table / chart / badges):

| Field | Default | Effect |
|:--|:--|:--|
| `treatFirstRowAsHeader` | `true` | Strips row 0 from the body — used as column headers in `data-table`, series names in `data-chart-line`, ignored by `badges-with-descriptions`. |
| `reverseRows` | `false` | Reverses the body rows after the header split. Use when newer data sits at the top of the range and you want chronological-ascending charts. |
| `label` | unset | Optional override for the card's topbar. |

`data-stat` ignores all three (single cell, no rows).

## Limits

- 60-second in-memory cache on `getRange` (and therefore `getCell`).
- **No `listSpreadsheets` in v1.** Listing the user's spreadsheets requires Drive API scope, which we deliberately don't add (minimum-scope policy). The config body uses a free-text spreadsheet ID input — paste the long string between `/d/` and `/edit` in any sheet URL.
- A1 validator is loose by design: accepts unquoted sheet names (`Sheet1!A1:D20`), quoted sheet names (`'My Sheet'!B5`), and bare ranges (`A1:D20`). The Sheets API itself rejects malformed ranges with a 400 — surfaced as `IntegrationError("unknown")`.
