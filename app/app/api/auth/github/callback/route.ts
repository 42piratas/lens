import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { persistOAuthTokens } from "@/lib/auth/persist-oauth-tokens";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "lens_gh_oauth_state";
const TOKEN_URL = "https://github.com/login/oauth/access_token";

/** Redirect back to /settings with a diagnosable failure reason. */
function errorRedirect(base: URL, reason: string) {
  const u = new URL(base);
  u.searchParams.set("github", "error");
  u.searchParams.set("reason", reason);
  return NextResponse.redirect(u);
}

/**
 * GitHub App user-authorization callback. Verifies the CSRF `state` cookie,
 * exchanges the `code` for a user-to-server access token (server-side, with the
 * App client secret), and persists it to oauth_tokens (vault). On any failure
 * it redirects to /settings with `?github=error&reason=…` so the exact failure
 * point is visible.
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

  const settingsUrl = new URL("/settings", request.url);

  if (!code) return errorRedirect(settingsUrl, "no_code");
  if (!expected) return errorRedirect(settingsUrl, "no_state_cookie");
  if (!state || state !== expected) return errorRedirect(settingsUrl, "state_mismatch");

  const clientId = process.env.GITHUB_APP_CLIENT_ID;
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET;
  if (!clientId || !clientSecret) return errorRedirect(settingsUrl, "config");

  let token: string | null = null;
  let ghError: string | undefined;
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${url.origin}/api/auth/github/callback`,
      }),
      cache: "no-store",
    });
    const json = (await res.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };
    token = json.access_token ?? null;
    ghError = json.error_description ?? json.error;
  } catch (e) {
    ghError = (e as Error).message;
  }

  if (!token) {
    const reason = `token_${(ghError ?? "unknown").replace(/[^a-z0-9_]+/gi, "_")}`.slice(0, 60);
    return errorRedirect(settingsUrl, reason);
  }

  await persistOAuthTokens({
    userId,
    provider: "github",
    accessToken: token,
    refreshToken: null,
    expiresAt: null,
    scopes: [],
  });

  const okUrl = new URL("/settings", request.url);
  okUrl.searchParams.set("github", "connected");
  return NextResponse.redirect(okUrl);
}
