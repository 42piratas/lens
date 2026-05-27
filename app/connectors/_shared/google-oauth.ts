import "server-only";
import { IntegrationError } from "./integration-error";
import { getUserIdOrThrow } from "@/lib/auth/user-context";
import { readOAuthTokens, updateAccessToken } from "@/lib/auth/persist-oauth-tokens";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SAFETY_MARGIN_MS = 60_000;

type CachedToken = { accessToken: string; expiresAt: number };

/**
 * Per-user access-token cache. Keyed by userId so multiple signed-in users
 * served by the same Node instance don't race each other. Source of truth
 * is `public.oauth_tokens` (vault-encrypted) — env-var refresh-token mode
 * was removed in b02-15 along with the `GOOGLE_CALENDAR_REFRESH_TOKEN` env.
 */
const tokenCache = new Map<string, CachedToken>();
const inflight = new Map<string, Promise<CachedToken>>();

async function refreshFromDb(userId: string): Promise<CachedToken> {
  const stored = await readOAuthTokens({ userId, provider: "google" });
  if (!stored?.refreshToken) {
    throw new IntegrationError(
      "auth",
      "Google connection missing. Reconnect Google in /settings.",
    );
  }
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new IntegrationError(
      "auth",
      "Google OAuth client not configured (GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET).",
    );
  }
  const fresh = await exchangeRefreshToken({
    clientId,
    clientSecret,
    refreshToken: stored.refreshToken,
  });
  await updateAccessToken({
    userId,
    provider: "google",
    accessToken: fresh.accessToken,
    expiresAt: new Date(fresh.expiresAt),
  });
  return fresh;
}

async function exchangeRefreshToken(params: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<CachedToken> {
  const body = new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    refresh_token: params.refreshToken,
    grant_type: "refresh_token",
  });
  let res: Response;
  try {
    res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch (err) {
    throw new IntegrationError("network", `Token refresh failed: ${(err as Error).message}`);
  }
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 401 || res.status === 403 || res.status === 400) {
      throw new IntegrationError("auth", `Token refresh rejected (${res.status})`);
    }
    if (res.status === 429) {
      throw new IntegrationError("rate-limit", "Token refresh rate-limited");
    }
    throw new IntegrationError("unknown", `Token refresh ${res.status}`);
  }
  let json: { access_token?: string; expires_in?: number };
  try {
    json = JSON.parse(text) as { access_token?: string; expires_in?: number };
  } catch {
    throw new IntegrationError("unknown", "Token response malformed");
  }
  if (!json.access_token || !json.expires_in) {
    throw new IntegrationError("unknown", "Token response missing fields");
  }
  return {
    accessToken: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000 - SAFETY_MARGIN_MS,
  };
}

export async function getGoogleAccessToken(): Promise<string> {
  const userId = getUserIdOrThrow();
  const cached = tokenCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.accessToken;

  const pending = inflight.get(userId);
  if (pending) return (await pending).accessToken;

  const promise = refreshFromDb(userId).then((t) => {
    tokenCache.set(userId, t);
    return t;
  });
  inflight.set(userId, promise);
  try {
    return (await promise).accessToken;
  } finally {
    inflight.delete(userId);
  }
}

export function _resetGoogleTokenCache() {
  tokenCache.clear();
  inflight.clear();
}
