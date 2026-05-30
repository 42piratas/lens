import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "lens_gh_oauth_state";

/**
 * Initiates the GitHub App **user-authorization** (user-to-server OAuth) flow.
 *
 * Redirects to `login/oauth/authorize` — NOT `apps/<slug>/installations/new`.
 * The install URL only runs the OAuth handshake on a *fresh* install; once the
 * app is already installed, GitHub shows the installation-management page and
 * never issues a `code`, so LENS never receives a token. The authorize endpoint
 * issues the user-to-server token regardless of install state (repo selection
 * is managed separately at github.com/settings/installations).
 *
 * The CSRF `state` cookie is set **on the redirect response object** — setting
 * it via the `next/headers` `cookies()` helper does not reliably attach to a
 * `NextResponse.redirect()`, which would leave the callback with no state to
 * compare and silently fail. GitHub returns to /api/auth/github/callback with
 * `?code=…&state=…`.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  const clientId = process.env.GITHUB_APP_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: { kind: "config", message: "GITHUB_APP_CLIENT_ID is not configured" } },
      { status: 500 },
    );
  }
  const state = crypto.randomUUID();
  const redirectUri = `${new URL(request.url).origin}/api/auth/github/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });
  const res = NextResponse.redirect(
    `https://github.com/login/oauth/authorize?${params.toString()}`,
  );
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
