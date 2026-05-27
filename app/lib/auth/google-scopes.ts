/**
 * Google OAuth scopes for LENS user-sign-in.
 *
 * `GOOGLE_BASE_SCOPES` ship with every platform sign-in (Calendar + Sheets +
 * Tasks). These are non-sensitive and grant freely for any Google account.
 *
 * Note: Google Keep is intentionally NOT in this list. Keep does not support
 * standard user-OAuth scope grants — its access path is service-account +
 * domain-wide delegation (see `lib/auth/google-keep-sa.ts`, b02-12).
 */

export const GOOGLE_BASE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/tasks.readonly",
] as const;
