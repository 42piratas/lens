#!/usr/bin/env node
// Dev-mode Google OAuth helper for LENS connectors (Calendar + Sheets + Tasks + Keep).
// Prints an authorization URL, captures the redirect on a local port,
// exchanges the code for tokens, and writes the refresh token to stdout.
//
// Usage:
//   GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=... node scripts/google-oauth.mjs
//   (or paste the values into .env.local first and run via direnv / dotenv-cli)
//
// CLI flags:
//   --scope=<scope-url>   add a scope (repeatable). Defaults: Calendar + Sheets + Tasks + Keep readonly.
//   --scopes=a,b,c        comma-separated scopes (replaces defaults).
//
// One-time setup: in Google Cloud Console, create an OAuth 2.0 Client (Web application).
// Add http://localhost:53682/callback as an authorized redirect URI. Enable each Google
// API you grant scope for (Calendar API, Sheets API, etc.). The Keep API
// (`keep.googleapis.com`) requires a Google Workspace account — personal Gmail
// is not eligible.

import { createServer } from "node:http";
import { URL } from "node:url";

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
// Default scope set covers Calendar (read+write events from b02-05),
// Sheets (read-only), Tasks (read-only), and Keep (read-only — Workspace
// required, b02-12). The `calendar.events` write scope is needed by the
// b02-05 tag-like payload adapter. Read-only Calendar setups can pass
// `--scopes=https://www.googleapis.com/auth/calendar.readonly,...`.
const DEFAULT_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/tasks.readonly",
  "https://www.googleapis.com/auth/keep.readonly",
];

function parseScopes(argv) {
  const csv = argv.find((a) => a.startsWith("--scopes="));
  if (csv) return csv.slice("--scopes=".length).split(",").map((s) => s.trim()).filter(Boolean);
  const adds = argv.filter((a) => a.startsWith("--scope=")).map((a) => a.slice("--scope=".length).trim());
  return adds.length ? [...DEFAULT_SCOPES, ...adds] : DEFAULT_SCOPES;
}

const argv = process.argv.slice(2);
const SCOPES = parseScopes(argv);
const TOKEN_ENV_NAME = "GOOGLE_CALENDAR_REFRESH_TOKEN";

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    "Missing GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET in env. Set them and re-run.",
  );
  process.exit(1);
}

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", clientId);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPES.join(" "));
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");

console.log("\n  Requested scopes:");
for (const s of SCOPES) console.log(`    - ${s}`);
console.log("\n  Open this URL in your browser:\n");
console.log(`  ${authUrl.toString()}\n`);
console.log(`  Waiting for callback on ${REDIRECT_URI} ...\n`);

const server = createServer(async (req, res) => {
  if (!req.url) return;
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== "/callback") {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  if (error) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end(`OAuth error: ${error}`);
    console.error(`OAuth error: ${error}`);
    server.close();
    process.exit(1);
  }
  if (!code) {
    res.writeHead(400);
    res.end("no code");
    return;
  }
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    const text = await tokenRes.text();
    if (!tokenRes.ok) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(`Token exchange failed: ${text}`);
      console.error(`Token exchange failed: ${text}`);
      server.close();
      process.exit(1);
    }
    const json = JSON.parse(text);
    if (!json.refresh_token) {
      const hint =
        "No refresh_token returned. Revoke prior consent at https://myaccount.google.com/permissions and rerun, or use a different account.";
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(hint);
      console.error(hint);
      server.close();
      process.exit(1);
    }
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Authorized. You can close this tab.");
    console.log("\n  " + TOKEN_ENV_NAME + "=" + json.refresh_token + "\n");
    console.log("  Paste the line above into .env.local.\n");
    server.close();
    process.exit(0);
  } catch (err) {
    res.writeHead(500);
    res.end(String(err));
    console.error(err);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT);
