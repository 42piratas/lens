import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "lens_gh_oauth_state";

/**
 * Initiates the GitHub App install + user-authorization flow. Sets a CSRF
 * `state` cookie and redirects to the App's installation URL. GitHub installs
 * the App on the repos the user selects, then (because "Request user
 * authorization during installation" is enabled) redirects back to
 * /api/auth/github/callback with `?code=…&installation_id=…&state=…`.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  const slug = process.env.GITHUB_APP_SLUG;
  if (!slug) {
    return NextResponse.json(
      { error: { kind: "config", message: "GITHUB_APP_SLUG is not configured" } },
      { status: 500 },
    );
  }
  const state = crypto.randomUUID();
  const jar = await cookies();
  jar.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  const target = `https://github.com/apps/${slug}/installations/new?state=${encodeURIComponent(state)}`;
  return NextResponse.redirect(target);
}
