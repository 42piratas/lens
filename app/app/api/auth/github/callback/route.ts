import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { persistOAuthTokens } from "@/lib/auth/persist-oauth-tokens";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "lens_gh_oauth_state";
const TOKEN_URL = "https://github.com/login/oauth/access_token";

/**
 * GitHub App install + user-authorization callback. Verifies the CSRF `state`
 * cookie, exchanges the `code` for a user-to-server access token (server-side,
 * with the App client secret), and persists it to oauth_tokens (vault). The
 * token is read-only and bounded to the repos the user selected at install.
 */
export async function GET(request: Request) {
  const session = (await auth()) as { user?: { id?: string } } | null;
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const jar = await cookies();
  const expected = jar.get(STATE_COOKIE)?.value;
  jar.delete(STATE_COOKIE);

  const settingsUrl = new URL("/settings", request.url);

  if (!code || !state || !expected || state !== expected) {
    settingsUrl.searchParams.set("github", "error");
    return NextResponse.redirect(settingsUrl);
  }

  const clientId = process.env.GITHUB_APP_CLIENT_ID;
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    settingsUrl.searchParams.set("github", "config-error");
    return NextResponse.redirect(settingsUrl);
  }

  let token: string | null = null;
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
      cache: "no-store",
    });
    const json = (await res.json()) as { access_token?: string; error?: string };
    token = json.access_token ?? null;
  } catch {
    token = null;
  }

  if (!token) {
    settingsUrl.searchParams.set("github", "error");
    return NextResponse.redirect(settingsUrl);
  }

  await persistOAuthTokens({
    userId,
    provider: "github",
    accessToken: token,
    refreshToken: null,
    expiresAt: null,
    scopes: [],
  });

  settingsUrl.searchParams.set("github", "connected");
  return NextResponse.redirect(settingsUrl);
}
