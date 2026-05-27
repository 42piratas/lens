import "server-only";

/**
 * Workspace gate — Google Keep REST API V1 is gated by Google to Workspace
 * accounts only. We detect Workspace by the `hd` (hosted domain) claim on the
 * Google ID token / profile. Personal Gmail has no `hd`; Workspace accounts
 * carry the org's primary domain (e.g. "acme.com").
 *
 * The claim is harvested at sign-in (auth.ts jwt callback → profile.hd) and
 * propagated to the session as `session.user.hd`. Connector code reads it via
 * the helpers below.
 */

export function isWorkspaceDomain(hd: string | null | undefined): hd is string {
  return typeof hd === "string" && hd.length > 0;
}
