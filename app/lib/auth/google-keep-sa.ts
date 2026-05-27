import "server-only";
import { SignJWT, importPKCS8 } from "jose";
import { IntegrationError } from "@/connectors/_shared/integration-error";

/**
 * Google Keep — service-account + domain-wide delegation (DWD).
 *
 * The Google Keep REST API is enterprise-only and does not support standard
 * user-OAuth scope grants (the `keep.readonly` scope is not in Google's
 * OAuth 2.0 scopes catalog and not selectable on the consent screen). The
 * only documented auth path is a Workspace admin granting a service account
 * permission to impersonate users in their org.
 *
 * Setup (one-time, done by the Workspace admin):
 *   1. Create a service account in the GCP project that owns LENS.
 *   2. In Workspace admin console → Security → Access and data control →
 *      API controls → Domain-wide delegation, register the SA's client ID
 *      with scope `https://www.googleapis.com/auth/keep.readonly`.
 *   3. Set the env vars below.
 *
 * Required env vars:
 *   GOOGLE_KEEP_SA_KEY_JSON       — full service-account JSON key (the file
 *                                    contents, as a single line string).
 *   LENS_KEEP_WORKSPACE_DOMAIN    — the primary domain the DWD applies to
 *                                    (e.g. "42labs.io"). Users whose
 *                                    session.user.hd matches this domain
 *                                    get Keep auto-on; others see Keep
 *                                    hidden from the connector picker.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const KEEP_SCOPE = "https://www.googleapis.com/auth/keep.readonly";
const SAFETY_MARGIN_MS = 60_000;

type CachedToken = { accessToken: string; expiresAt: number };

const tokenCache = new Map<string, CachedToken>();
const inflight = new Map<string, Promise<CachedToken>>();

type ServiceAccountKey = {
  client_email: string;
  private_key: string;
};

function readSaKey(): ServiceAccountKey {
  const raw = process.env.GOOGLE_KEEP_SA_KEY_JSON;
  if (!raw) {
    throw new IntegrationError(
      "auth",
      "Keep is not configured. Set GOOGLE_KEEP_SA_KEY_JSON in .env.local — see app/connectors/keep/README.md.",
    );
  }
  let parsed: ServiceAccountKey;
  try {
    parsed = JSON.parse(raw) as ServiceAccountKey;
  } catch {
    throw new IntegrationError(
      "auth",
      "GOOGLE_KEEP_SA_KEY_JSON is not valid JSON.",
    );
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new IntegrationError(
      "auth",
      "GOOGLE_KEEP_SA_KEY_JSON missing client_email or private_key.",
    );
  }
  return parsed;
}

async function mintImpersonatedToken(userEmail: string): Promise<CachedToken> {
  const sa = readSaKey();
  const now = Math.floor(Date.now() / 1000);

  const privateKey = await importPKCS8(sa.private_key, "RS256");

  const assertion = await new SignJWT({
    scope: KEEP_SCOPE,
    // `sub` is the impersonation target (the end user whose Keep notes
    // we want to read). The SA must be granted DWD with this scope, and
    // the user must be in the same Workspace.
    sub: userEmail,
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  let res: Response;
  try {
    res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
  } catch (err) {
    throw new IntegrationError(
      "network",
      `Keep SA token exchange failed: ${(err as Error).message}`,
    );
  }
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new IntegrationError(
        "auth",
        `Keep SA token rejected (${res.status}). Verify domain-wide delegation is configured for ${KEEP_SCOPE}.`,
      );
    }
    if (res.status === 400) {
      throw new IntegrationError(
        "auth",
        `Keep SA token rejected (400) — likely the impersonation target ${userEmail} is not in the Workspace domain the SA can impersonate.`,
      );
    }
    throw new IntegrationError(
      "unknown",
      `Keep SA token ${res.status}: ${text || res.statusText}`,
    );
  }
  let json: { access_token?: string; expires_in?: number };
  try {
    json = JSON.parse(text) as { access_token?: string; expires_in?: number };
  } catch {
    throw new IntegrationError("unknown", "Keep SA token response malformed");
  }
  if (!json.access_token || !json.expires_in) {
    throw new IntegrationError("unknown", "Keep SA token response missing fields");
  }
  return {
    accessToken: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000 - SAFETY_MARGIN_MS,
  };
}

/**
 * Returns an access token impersonating `userEmail`, valid for ~1h minus
 * the 60s safety margin. Cached per-user in-process.
 */
export async function getKeepAccessTokenFor(userEmail: string): Promise<string> {
  const cached = tokenCache.get(userEmail);
  if (cached && cached.expiresAt > Date.now()) return cached.accessToken;

  const pending = inflight.get(userEmail);
  if (pending) return (await pending).accessToken;

  const promise = mintImpersonatedToken(userEmail).then((t) => {
    tokenCache.set(userEmail, t);
    return t;
  });
  inflight.set(userEmail, promise);
  try {
    return (await promise).accessToken;
  } finally {
    inflight.delete(userEmail);
  }
}

export function _resetKeepSaCache() {
  tokenCache.clear();
  inflight.clear();
}

/**
 * The Workspace domain that domain-wide delegation applies to. Read at
 * call time so test envs can stub it. Returns null when unset.
 */
export function getKeepWorkspaceDomain(): string | null {
  const d = process.env.LENS_KEEP_WORKSPACE_DOMAIN;
  return d && d.length > 0 ? d : null;
}
