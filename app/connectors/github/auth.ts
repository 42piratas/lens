import "server-only";
import { IntegrationError } from "./types";
import { getUserIdOrThrow } from "@/lib/auth/user-context";
import { readOAuthTokens } from "@/lib/auth/persist-oauth-tokens";

// GitHub connects as a post-sign-in connection: a GitHub App installation +
// user-to-server authorization. The user-to-server token is read-only (the App
// declares only read permissions) and bounded to the repos the user selected at
// install time. No private key / installation-token minting in V1 (see block
// b02-13 D9) — every read uses this single token.

export async function readGithubToken(): Promise<string> {
  const userId = getUserIdOrThrow();
  const stored = await readOAuthTokens({ userId, provider: "github" });
  if (!stored) {
    throw new IntegrationError(
      "auth",
      "GitHub not connected. Connect GitHub in /settings.",
    );
  }
  return stored.accessToken;
}
